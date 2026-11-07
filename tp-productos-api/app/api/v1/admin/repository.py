from sqlalchemy import func, select

from poc_postgresql.database import SessionLocal
from poc_postgresql.models import PedidoDB, UsuarioDB

METODOS = ["efectivo", "transferencia", "tarjeta_credito", "otros"]


class EmailEnUso(Exception):
    """Otro usuario ya tiene ese email."""


def _to_dict(usuario: UsuarioDB) -> dict:
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "email": usuario.email,
        "telefono": usuario.telefono,
        "activo": bool(usuario.activo),
        "estado": usuario.estado,
    }


def _get_corralon(session, corralon_id: int):
    usuario = session.get(UsuarioDB, corralon_id)
    if usuario is None or usuario.rol != "proveedor":
        return None
    return usuario


def listar_corralones(estado: str | None = None) -> list[dict]:
    with SessionLocal() as session:
        consulta = select(UsuarioDB).where(UsuarioDB.rol == "proveedor").order_by(UsuarioDB.id)
        if estado is not None:
            consulta = consulta.where(UsuarioDB.estado == estado)
        return [_to_dict(u) for u in session.scalars(consulta).all()]


def editar_corralon(corralon_id: int, nombre: str, email: str, telefono: str | None, activo: bool):
    with SessionLocal() as session:
        usuario = _get_corralon(session, corralon_id)
        if usuario is None:
            return None

        email = email.strip().lower()
        otro = session.scalar(
            select(UsuarioDB).where(UsuarioDB.email == email, UsuarioDB.id != corralon_id)
        )
        if otro is not None:
            raise EmailEnUso()

        usuario.nombre = nombre.strip()
        usuario.email = email
        usuario.telefono = telefono
        usuario.activo = activo
        session.commit()
        session.refresh(usuario)
        return _to_dict(usuario)


def cambiar_estado(corralon_id: int, estado: str):
    with SessionLocal() as session:
        usuario = _get_corralon(session, corralon_id)
        if usuario is None:
            return None

        usuario.estado = estado
        session.commit()
        session.refresh(usuario)
        return _to_dict(usuario)


def estadisticas_pagos() -> dict:
    with SessionLocal() as session:
        filas = session.execute(
            select(
                PedidoDB.metodo_pago,
                func.count(PedidoDB.id),
                func.coalesce(func.sum(PedidoDB.total), 0),
            )
            .where(PedidoDB.estado == "pagado")
            .group_by(PedidoDB.metodo_pago)
        ).all()

    por_metodo = {m: {"cantidad": 0, "monto": 0.0} for m in METODOS}
    for metodo, cantidad, monto in filas:
        if metodo in por_metodo:
            por_metodo[metodo] = {"cantidad": int(cantidad), "monto": float(monto)}

    return {
        "metodos": [{"metodo": m, **datos} for m, datos in por_metodo.items()],
        "total_pedidos_pagados": sum(d["cantidad"] for d in por_metodo.values()),
        "total_monto": sum(d["monto"] for d in por_metodo.values()),
    }

from sqlalchemy import select

from poc_postgresql.database import SessionLocal
from poc_postgresql.models import UsuarioDB

from .seguridad import hashear_password, verificar_password


class CuentaNoHabilitada(Exception):
    """La contraseña es correcta, pero la cuenta está bloqueada (rechazada)."""


def _to_dict(usuario: UsuarioDB) -> dict:
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "email": usuario.email,
        "rol": usuario.rol,
        "estado": usuario.estado,
    }


def _buscar_por_email(session, email: str):
    return session.scalar(select(UsuarioDB).where(UsuarioDB.email == email.lower()))


def registrar(data):
    with SessionLocal() as session:
        if _buscar_por_email(session, data.email) is not None:
            return None

        # Un corralón nuevo queda pendiente: puede entrar a la app, pero no puede
        # operar (cargar productos, etc.) hasta que el admin apruebe su solicitud
        estado = "pendiente" if data.rol == "proveedor" else "aprobado"

        usuario = UsuarioDB(
            nombre=data.nombre.strip(),
            email=data.email.lower(),
            password_hash=hashear_password(data.password),
            rol=data.rol,
            estado=estado,
        )
        session.add(usuario)
        session.commit()
        session.refresh(usuario)

        return _to_dict(usuario)


def autenticar(email: str, password: str):
    with SessionLocal() as session:
        usuario = _buscar_por_email(session, email)

        if usuario is None or not usuario.activo:
            return None

        if not verificar_password(password, usuario.password_hash):
            return None

        # Un corralón pendiente SÍ puede entrar (para mandar su solicitud): lo que no
        # puede es operar. "rechazado" queda para cuando el administrador bloquea la cuenta.
        # Recién con la contraseña correcta se avisa el estado de la cuenta.
        if usuario.estado == "rechazado":
            raise CuentaNoHabilitada(
                "Tu cuenta de corralón fue rechazada. Comunicate con el administrador."
            )

        return _to_dict(usuario)


def es_admin(usuario_id: int) -> bool:
    with SessionLocal() as session:
        usuario = session.get(UsuarioDB, usuario_id)
        return usuario is not None and bool(usuario.activo) and usuario.rol == "admin"


def proveedor_aprobado(usuario_id: int) -> bool:
    """True si es un corralón activo y con la solicitud aprobada (puede operar)."""
    with SessionLocal() as session:
        usuario = session.get(UsuarioDB, usuario_id)
        return (
            usuario is not None
            and bool(usuario.activo)
            and usuario.rol == "proveedor"
            and usuario.estado == "aprobado"
        )


def listar() -> list[dict]:
    with SessionLocal() as session:
        usuarios = session.scalars(select(UsuarioDB).order_by(UsuarioDB.id)).all()
        return [{**_to_dict(u), "activo": bool(u.activo)} for u in usuarios]

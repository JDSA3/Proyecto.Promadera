from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from poc_postgresql.database import SessionLocal
from poc_postgresql.models import (
    OrdenCompraDB,
    OrdenCompraItemDB,
    ProductoDB,
    ProveedorInsumoDB,
    UsuarioDB,
)


class DatosInvalidos(Exception):
    pass


class NoEncontrado(Exception):
    pass


class SinPermiso(Exception):
    pass


class EstadoInvalido(Exception):
    pass


def _proveedor_to_dict(proveedor: ProveedorInsumoDB):
    return {
        "id": proveedor.id,
        "corralon_id": proveedor.corralon_id,
        "nombre": proveedor.nombre,
        "telefono": proveedor.telefono,
        "email": proveedor.email,
    }


def _orden_to_dict(orden: OrdenCompraDB):
    return {
        "id": orden.id,
        "corralon_id": orden.corralon_id,
        "estado": orden.estado,
        "creado_en": orden.creado_en,
        "recibida_en": orden.recibida_en,
        "proveedor": {"id": orden.proveedor.id, "nombre": orden.proveedor.nombre},
        "items": [
            {
                "producto_id": item.producto_id,
                "nombre": item.producto.nombre,
                "cantidad": item.cantidad,
                "stock_actual": item.producto.stock,
            }
            for item in orden.items
        ],
    }


def _consulta_ordenes():
    return select(OrdenCompraDB).options(
        selectinload(OrdenCompraDB.proveedor),
        selectinload(OrdenCompraDB.items).selectinload(OrdenCompraItemDB.producto),
    )


def _validar_corralon(session, corralon_id: int):
    corralon = session.get(UsuarioDB, corralon_id)

    if corralon is None or not corralon.activo or corralon.rol != "proveedor":
        raise DatosInvalidos(f"El usuario {corralon_id} no es un corralón")


def list_proveedores(corralon_id: int | None = None):
    consulta = (
        select(ProveedorInsumoDB)
        .where(ProveedorInsumoDB.activo.is_(True))
        .order_by(ProveedorInsumoDB.nombre)
    )

    if corralon_id is not None:
        consulta = consulta.where(ProveedorInsumoDB.corralon_id == corralon_id)

    with SessionLocal() as session:
        return [_proveedor_to_dict(p) for p in session.scalars(consulta)]


def create_proveedor(data):
    with SessionLocal() as session, session.begin():
        _validar_corralon(session, data.corralon_id)
        proveedor = ProveedorInsumoDB(**data.model_dump())
        session.add(proveedor)
        session.flush()

        return _proveedor_to_dict(proveedor)


def list_ordenes(corralon_id: int | None = None, estado: str | None = None):
    consulta = _consulta_ordenes().order_by(OrdenCompraDB.id.desc())

    if corralon_id is not None:
        consulta = consulta.where(OrdenCompraDB.corralon_id == corralon_id)

    if estado is not None:
        consulta = consulta.where(OrdenCompraDB.estado == estado)

    with SessionLocal() as session:
        return [_orden_to_dict(o) for o in session.scalars(consulta)]


def create_orden(data):
    cantidades: dict[int, int] = {}
    for item in data.items:
        cantidades[item.producto_id] = cantidades.get(item.producto_id, 0) + item.cantidad

    with SessionLocal() as session, session.begin():
        _validar_corralon(session, data.corralon_id)

        proveedor = session.get(ProveedorInsumoDB, data.proveedor_insumo_id)
        if proveedor is None or not proveedor.activo or proveedor.corralon_id != data.corralon_id:
            raise DatosInvalidos(
                f"El proveedor {data.proveedor_insumo_id} no es del corralón {data.corralon_id}"
            )

        productos = session.scalars(select(ProductoDB).where(ProductoDB.id.in_(cantidades)))
        por_id = {producto.id: producto for producto in productos}

        orden = OrdenCompraDB(corralon_id=data.corralon_id, proveedor=proveedor, estado="pendiente")
        for producto_id, cantidad in cantidades.items():
            producto = por_id.get(producto_id)

            if producto is None or not producto.activo or producto.proveedor_id != data.corralon_id:
                raise DatosInvalidos(f"El producto {producto_id} no es del corralón {data.corralon_id}")

            orden.items.append(OrdenCompraItemDB(producto=producto, cantidad=cantidad))

        session.add(orden)
        session.flush()
        session.refresh(orden)

        return _orden_to_dict(orden)


def recibir(orden_id: int, data):
    with SessionLocal() as session, session.begin():
        orden = session.scalar(
            _consulta_ordenes().where(OrdenCompraDB.id == orden_id).with_for_update(of=OrdenCompraDB)
        )

        if orden is None:
            raise NoEncontrado(f"Orden de compra {orden_id} no encontrada")

        if orden.corralon_id != data.usuario_id:
            raise SinPermiso(f"La orden {orden_id} no es del corralón {data.usuario_id}")

        if orden.estado != "pendiente":
            raise EstadoInvalido(f"La orden {orden_id} ya fue recibida")

        productos = session.scalars(
            select(ProductoDB)
            .where(ProductoDB.id.in_([item.producto_id for item in orden.items]))
            .with_for_update()
        )
        por_id = {producto.id: producto for producto in productos}

        for item in orden.items:
            por_id[item.producto_id].stock += item.cantidad

        orden.estado = "recibida"
        orden.recibida_en = func.now()
        session.flush()
        session.refresh(orden)

        return _orden_to_dict(orden)

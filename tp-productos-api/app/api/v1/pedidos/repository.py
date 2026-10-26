from sqlalchemy import select
from sqlalchemy.orm import selectinload

from poc_postgresql.database import SessionLocal
from poc_postgresql.models import (
    PedidoCorralonDB,
    PedidoDB,
    PedidoItemDB,
    ProductoDB,
    UsuarioDB,
)


class DatosInvalidos(Exception):
    pass


class StockInsuficiente(Exception):
    pass


def _item_to_dict(item: PedidoItemDB):
    return {
        "producto_id": item.producto_id,
        "nombre": item.producto.nombre,
        "proveedor_id": item.producto.proveedor_id,
        "cantidad": item.cantidad,
        "precio_unitario": float(item.precio_unitario),
        "subtotal": float(item.precio_unitario * item.cantidad),
    }


def _corralon_to_dict(corralon: PedidoCorralonDB):
    return {
        "proveedor_id": corralon.proveedor_id,
        "proveedor_nombre": corralon.proveedor.nombre if corralon.proveedor else None,
        "estado": corralon.estado,
        "total": float(corralon.total),
        "motivo_devolucion": corralon.motivo_devolucion,
        "items": [_item_to_dict(item) for item in corralon.items],
    }


def _to_dict(pedido: PedidoDB, proveedor_id: int | None = None):
    items = [_item_to_dict(item) for item in pedido.items]
    corralones = [_corralon_to_dict(c) for c in pedido.corralones]
    total = float(pedido.total)

    if proveedor_id is not None:
        items = [item for item in items if item["proveedor_id"] == proveedor_id]
        corralones = [c for c in corralones if c["proveedor_id"] == proveedor_id]
        total = sum(item["subtotal"] for item in items)

    return {
        "id": pedido.id,
        "estado": pedido.estado,
        "total": total,
        "creado_en": pedido.creado_en,
        "cliente": {"id": pedido.cliente.id, "nombre": pedido.cliente.nombre},
        "items": items,
        "corralones": corralones,
    }


def _consulta_pedidos():
    return select(PedidoDB).options(
        selectinload(PedidoDB.cliente),
        selectinload(PedidoDB.items).selectinload(PedidoItemDB.producto),
        selectinload(PedidoDB.corralones).selectinload(PedidoCorralonDB.proveedor),
        selectinload(PedidoDB.corralones)
        .selectinload(PedidoCorralonDB.items)
        .selectinload(PedidoItemDB.producto),
    )


def list_pedidos(cliente_id: int | None = None, proveedor_id: int | None = None):
    consulta = _consulta_pedidos().order_by(PedidoDB.id.desc())

    if cliente_id is not None:
        consulta = consulta.where(PedidoDB.cliente_id == cliente_id)

    if proveedor_id is not None:
        consulta = consulta.where(
            PedidoDB.items.any(PedidoItemDB.producto.has(ProductoDB.proveedor_id == proveedor_id))
        )

    with SessionLocal() as session:
        return [_to_dict(p, proveedor_id) for p in session.scalars(consulta)]


def get_by_id(pedido_id: int):
    with SessionLocal() as session:
        pedido = session.scalar(_consulta_pedidos().where(PedidoDB.id == pedido_id))

        if pedido is None:
            return None

        return _to_dict(pedido)


def marcar_pagado(pedido_id: int):
    with SessionLocal() as session, session.begin():
        pedido = session.scalar(
            _consulta_pedidos().where(PedidoDB.id == pedido_id).with_for_update(of=PedidoDB)
        )

        if pedido is None or pedido.estado != "pendiente":
            return None

        pedido.estado = "pagado"
        session.flush()

        return _to_dict(pedido)


def create(data):
    cantidades: dict[int, int] = {}
    for item in data.items:
        cantidades[item.producto_id] = cantidades.get(item.producto_id, 0) + item.cantidad

    with SessionLocal() as session, session.begin():
        cliente = session.get(UsuarioDB, data.cliente_id)

        if cliente is None or not cliente.activo:
            raise DatosInvalidos(f"El cliente {data.cliente_id} no existe")

        if cliente.rol != "cliente":
            raise DatosInvalidos(f"El usuario {data.cliente_id} no es un cliente")

        productos = session.scalars(
            select(ProductoDB).where(ProductoDB.id.in_(cantidades)).with_for_update()
        )
        por_id = {producto.id: producto for producto in productos}

        pedido = PedidoDB(cliente=cliente, estado="pendiente", total=0)
        total = 0
        corralones: dict[int | None, PedidoCorralonDB] = {}

        for producto_id, cantidad in cantidades.items():
            producto = por_id.get(producto_id)

            if producto is None or not producto.activo:
                raise DatosInvalidos(f"El producto {producto_id} no existe")

            if producto.stock < cantidad:
                raise StockInsuficiente(
                    f"No hay stock suficiente de '{producto.nombre}': "
                    f"pediste {cantidad} y quedan {producto.stock}"
                )

            producto.stock -= cantidad
            corralon = corralones.get(producto.proveedor_id)
            if corralon is None:
                corralon = PedidoCorralonDB(proveedor_id=producto.proveedor_id, estado="pendiente", total=0)
                corralones[producto.proveedor_id] = corralon
                pedido.corralones.append(corralon)

            item = PedidoItemDB(producto=producto, cantidad=cantidad, precio_unitario=producto.precio)
            pedido.items.append(item)
            corralon.items.append(item)
            corralon.total += producto.precio * cantidad
            total += producto.precio * cantidad

        pedido.total = total
        session.add(pedido)
        session.flush()
        session.refresh(pedido)

        return _to_dict(pedido)

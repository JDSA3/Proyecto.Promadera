from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

from poc_postgresql.database import SessionLocal
from poc_postgresql.models import (
    PedidoCorralonDB,
    PedidoDB,
    PedidoItemDB,
    ProductoDB,
    UsuarioDB,
)

HORA_ARGENTINA = timezone(timedelta(hours=-3))
ESTADOS_QUE_NO_SON_VENTA = ("cancelado", "devuelto")
ESTADOS_PENDIENTES = ("pendiente", "confirmado", "enviado")


def _inicio_del_mes() -> datetime:
    ahora = datetime.now(HORA_ARGENTINA)
    return ahora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def resumen(corralon_id: int, stock_minimo: int, cantidad_mas_vendidos: int):
    with SessionLocal() as session:
        corralon = session.get(UsuarioDB, corralon_id)

        if corralon is None or not corralon.activo or corralon.rol != "proveedor":
            return None

        inicio = _inicio_del_mes()
        partes_pagadas = (
            select(PedidoCorralonDB)
            .join(PedidoDB)
            .where(PedidoCorralonDB.proveedor_id == corralon_id, PedidoDB.estado == "pagado")
        )
        ventas_del_mes = partes_pagadas.where(
            PedidoDB.creado_en >= inicio,
            PedidoCorralonDB.estado.not_in(ESTADOS_QUE_NO_SON_VENTA),
        ).subquery()

        ventas_mes, pedidos_mes = session.execute(
            select(func.coalesce(func.sum(ventas_del_mes.c.total), 0), func.count())
        ).one()

        por_estado = dict(
            session.execute(
                select(PedidoCorralonDB.estado, func.count())
                .join(PedidoDB)
                .where(PedidoCorralonDB.proveedor_id == corralon_id, PedidoDB.estado == "pagado")
                .group_by(PedidoCorralonDB.estado)
            ).all()
        )

        cantidad = func.sum(PedidoItemDB.cantidad)
        mas_vendidos = session.execute(
            select(
                ProductoDB.id,
                ProductoDB.nombre,
                cantidad,
                func.sum(PedidoItemDB.cantidad * PedidoItemDB.precio_unitario),
            )
            .select_from(PedidoItemDB)
            .join(ProductoDB, PedidoItemDB.producto_id == ProductoDB.id)
            .join(PedidoCorralonDB, PedidoItemDB.pedido_corralon_id == PedidoCorralonDB.id)
            .join(PedidoDB, PedidoItemDB.pedido_id == PedidoDB.id)
            .where(
                PedidoCorralonDB.proveedor_id == corralon_id,
                PedidoDB.estado == "pagado",
                PedidoDB.creado_en >= inicio,
                PedidoCorralonDB.estado.not_in(ESTADOS_QUE_NO_SON_VENTA),
            )
            .group_by(ProductoDB.id, ProductoDB.nombre)
            .order_by(cantidad.desc(), ProductoDB.id)
            .limit(cantidad_mas_vendidos)
        ).all()

        stock_bajo = session.execute(
            select(ProductoDB.id, ProductoDB.nombre, ProductoDB.stock)
            .where(
                ProductoDB.proveedor_id == corralon_id,
                ProductoDB.activo,
                ProductoDB.stock <= stock_minimo,
            )
            .order_by(ProductoDB.stock, ProductoDB.id)
        ).all()

        return {
            "corralon_id": corralon.id,
            "corralon_nombre": corralon.nombre,
            "mes": inicio.strftime("%Y-%m"),
            "ventas_mes": float(ventas_mes),
            "pedidos_mes": pedidos_mes,
            "pedidos_pendientes": sum(por_estado.get(e, 0) for e in ESTADOS_PENDIENTES),
            "pedidos_por_estado": por_estado,
            "mas_vendidos": [
                {"producto_id": i, "nombre": n, "cantidad": c, "total": float(t)}
                for i, n, c, t in mas_vendidos
            ],
            "stock_bajo": [{"producto_id": i, "nombre": n, "stock": s} for i, n, s in stock_bajo],
        }

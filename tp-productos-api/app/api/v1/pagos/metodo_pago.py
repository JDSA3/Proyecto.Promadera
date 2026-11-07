from poc_postgresql.database import SessionLocal
from poc_postgresql.models import PedidoDB

# payment_type_id de Mercado Pago -> método que guardamos
_MAPA = {
    "credit_card": "tarjeta_credito",
    "bank_transfer": "transferencia",
    "ticket": "efectivo",
    "atm": "efectivo",
}


def desde_mercadopago(payment_type_id) -> str:
    return _MAPA.get(str(payment_type_id or ""), "otros")


def guardar(pedido_id: int, metodo: str) -> None:
    with SessionLocal() as session:
        pedido = session.get(PedidoDB, pedido_id)
        if pedido is not None:
            pedido.metodo_pago = metodo
            session.commit()
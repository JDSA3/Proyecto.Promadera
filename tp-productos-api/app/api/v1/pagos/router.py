from fastapi import APIRouter, HTTPException, status

from app.api.v1.pedidos import repository as pedidos
from app.api.v1.pedidos.schemas import PedidoResponse

from . import mercadopago
from .schemas import PagoRequest, PreferenciaResponse

router = APIRouter(prefix="/pagos", tags=["Pagos"])


def _pedido_pendiente(pedido_id: int):
    pedido = pedidos.get_by_id(pedido_id)

    if pedido is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido {pedido_id} no encontrado",
        )

    if pedido["estado"] != "pendiente":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El pedido {pedido_id} está {pedido['estado']}",
        )

    return pedido


@router.post(
    "/preferencia",
    response_model=PreferenciaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear el pago en Mercado Pago",
    description=(
        "Crea una preferencia de Checkout Pro con los items del pedido "
        "y devuelve el link de pago (init_point). El token se lee del "
        ".env (MP_ACCESS_TOKEN)."
    ),
    responses={
        404: {"description": "Pedido no encontrado"},
        409: {"description": "El pedido no está pendiente"},
        502: {"description": "Mercado Pago devolvió un error"},
        503: {"description": "Falta MP_ACCESS_TOKEN en el .env"},
    },
)
def crear_preferencia(datos: PagoRequest):
    pedido = _pedido_pendiente(datos.pedido_id)

    try:
        preferencia = mercadopago.crear_preferencia(pedido)
    except mercadopago.SinToken as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        )
    except mercadopago.ErrorMercadoPago as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        )

    return {
        "pedido_id": pedido["id"],
        "preference_id": preferencia["id"],
        "init_point": preferencia["init_point"],
        "sandbox_init_point": preferencia.get("sandbox_init_point"),
    }


@router.post(
    "/simular",
    response_model=PedidoResponse,
    summary="Simular el pago (plan B)",
    description="Marca un pedido pendiente como pagado, sin Mercado Pago.",
    responses={
        404: {"description": "Pedido no encontrado"},
        409: {"description": "El pedido no está pendiente"},
    },
)
def simular_pago(datos: PagoRequest):
    _pedido_pendiente(datos.pedido_id)
    pedido = pedidos.marcar_pagado(datos.pedido_id)

    if pedido is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El pedido {datos.pedido_id} ya no está pendiente",
        )

    return pedido

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status

from app.api.v1.pedidos import correos
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
    description=(
        "Marca un pedido pendiente como pagado, sin Mercado Pago. Después de responder, manda al cliente el "
        "correo con el comprobante y avisa a cada corralón del pedido (si falla el correo, el pago igual queda)."
    ),
    responses={
        404: {"description": "Pedido no encontrado"},
        409: {"description": "El pedido no está pendiente"},
    },
)
def simular_pago(datos: PagoRequest, tareas: BackgroundTasks):
    _pedido_pendiente(datos.pedido_id)
    pedido = pedidos.marcar_pagado(datos.pedido_id)

    if pedido is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El pedido {datos.pedido_id} ya no está pendiente",
        )

    tareas.add_task(correos.enviar_pago_confirmado, pedido)
    return pedido


@router.post(
    "/webhook",
    summary="Aviso de Mercado Pago (webhook)",
    description=(
        "Mercado Pago llama a esta URL cuando cambia un pago. El backend vuelve a consultar el pago en Mercado Pago "
        "con el token (no confía en lo que llega en el aviso) y, si está aprobado y el monto alcanza, pasa el pedido "
        "de external_reference a pagado y manda los correos (comprobante al cliente y aviso a los corralones). Los avisos que no son de pagos se ignoran. Necesita una URL pública: se "
        "configura en MP_WEBHOOK_URL o en el panel de Mercado Pago."
    ),
    responses={
        502: {"description": "No se pudo consultar el pago en Mercado Pago (Mercado Pago reintenta)"},
        503: {"description": "Falta MP_ACCESS_TOKEN"},
    },
)
async def webhook_mercado_pago(request: Request, tareas: BackgroundTasks):
    try:
        cuerpo = await request.json()
    except ValueError:
        cuerpo = {}

    if not isinstance(cuerpo, dict):
        cuerpo = {}

    parametros = request.query_params
    tipo = cuerpo.get("type") or parametros.get("type") or parametros.get("topic")
    pago_id = (cuerpo.get("data") or {}).get("id") or parametros.get("data.id") or parametros.get("id")

    if tipo != "payment" or not pago_id:
        return {"procesado": False, "motivo": "El aviso no es de un pago"}

    try:
        pago = mercadopago.obtener_pago(str(pago_id))
    except mercadopago.SinToken as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error))
    except mercadopago.ErrorMercadoPago as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error))

    referencia = str(pago.get("external_reference") or "")

    if pago.get("status") != "approved" or not referencia.isdigit():
        return {"procesado": False, "motivo": f"Pago {pago.get('status')}"}

    pedido = pedidos.get_by_id(int(referencia))

    if pedido is None:
        return {"procesado": False, "motivo": f"Pedido {referencia} no encontrado"}

    if float(pago.get("transaction_amount") or 0) < pedido["total"]:
        return {"procesado": False, "motivo": "El monto pagado no alcanza el total del pedido"}

    if pedido["estado"] != "pendiente":
        return {"procesado": False, "motivo": f"El pedido ya estaba {pedido['estado']}"}

    pagado = pedidos.marcar_pagado(pedido["id"])

    if pagado is None:
        return {"procesado": False, "motivo": "El pedido ya no estaba pendiente"}

    tareas.add_task(correos.enviar_pago_confirmado, pagado)
    return {"procesado": True, "pedido_id": pedido["id"]}

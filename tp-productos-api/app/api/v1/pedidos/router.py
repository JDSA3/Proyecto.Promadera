from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from . import correos, repository
from .schemas import (
    CambioEstadoCorralon,
    CancelarPedido,
    PedidoCreate,
    PedidoResponse,
    ReportarDevolucion,
)

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])


@router.get(
    "",
    response_model=list[PedidoResponse],
    summary="Listar pedidos",
    description=(
        "Devuelve los pedidos, del más nuevo al más viejo. Con cliente_id muestra los pedidos de ese cliente. "
        "Con proveedor_id muestra los pedidos que tienen productos de ese proveedor: solo aparecen sus items "
        "y su parte en corralones, y el total es la suma de esos items."
    ),
)
def listar_pedidos(cliente_id: int | None = None, proveedor_id: int | None = None):
    return repository.list_pedidos(cliente_id, proveedor_id)


@router.get(
    "/{pedido_id}",
    response_model=PedidoResponse,
    summary="Obtener un pedido por ID",
    description=(
        "Devuelve el pedido con sus items y, en corralones, una sub-orden por corralón con su estado, "
        "total, motivo de devolución e items."
    ),
    responses={404: {"description": "Pedido no encontrado"}},
)
def obtener_pedido(pedido_id: int):
    pedido = repository.get_by_id(pedido_id)

    if pedido is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido {pedido_id} no encontrado",
        )
    return pedido


@router.post(
    "",
    response_model=PedidoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un pedido",
    description=(
        "Crea un pedido en estado pendiente para un cliente. Los precios se toman de la base, no del frontend. "
        "Si hay stock de todos los productos, lo descuenta; si falta stock de alguno, no se guarda nada. "
        "Con largo_cm en un item se pide un corte a medida: el precio es proporcional al largo y se descuentan "
        "las piezas enteras que hacen falta para sacar esos cortes. "
        "Genera una sub-orden (en corralones) por cada corralón de los productos, en estado pendiente. "
        "Después de responder, manda al cliente el correo \"Pedido recibido\" (si falla, el pedido igual queda guardado)."
    ),
    responses={
        400: {"description": "El cliente o algún producto no existe (o el usuario no es cliente)"},
        409: {"description": "No hay stock suficiente de algún producto"},
    },
)
def crear_pedido(datos: PedidoCreate, tareas: BackgroundTasks):
    try:
        pedido = repository.create(datos)
    except repository.DatosInvalidos as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))
    except repository.StockInsuficiente as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))

    tareas.add_task(correos.enviar_pedido_recibido, pedido)
    return pedido


def _errores(funcion, *args):
    try:
        return funcion(*args)
    except repository.NoEncontrado as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    except repository.SinPermiso as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error))
    except repository.EstadoInvalido as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))
    except repository.DatosInvalidos as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


@router.patch(
    "/{pedido_id}/corralones/{proveedor_id}",
    response_model=PedidoResponse,
    summary="Cambiar el estado de la parte de un corralón",
    description=(
        "El corralón avanza su parte del pedido: pendiente -> confirmado (el pedido tiene que estar pagado) "
        "-> enviado -> entregado. Desde entregado puede pasar a devuelto, con motivo obligatorio. "
        "La devolución no repone stock. usuario_id tiene que ser el mismo corralón (proveedor_id); "
        "para devuelto también puede ser el cliente dueño del pedido (botón Reportar problema)."
    ),
    responses={
        400: {"description": "Falta el motivo de la devolución"},
        403: {"description": "El usuario no es ese corralón (ni el cliente, si es una devolución)"},
        404: {"description": "El pedido no existe o no tiene productos de ese corralón"},
        409: {"description": "El cambio no se puede hacer desde el estado actual"},
    },
)
def cambiar_estado_corralon(pedido_id: int, proveedor_id: int, datos: CambioEstadoCorralon):
    return _errores(repository.cambiar_estado_corralon, pedido_id, proveedor_id, datos)


@router.post(
    "/{pedido_id}/corralones/{proveedor_id}/devolucion",
    response_model=PedidoResponse,
    summary="Reportar un problema con el material",
    description=(
        "El cliente avisa que el material de un corralón llegó mal. Solo se puede si esa parte está entregada. "
        "La parte pasa a devuelto con el motivo. No repone stock."
    ),
    responses={
        400: {"description": "Falta el motivo"},
        403: {"description": "El pedido no es de ese usuario"},
        404: {"description": "El pedido no existe o no tiene productos de ese corralón"},
        409: {"description": "La parte del corralón todavía no está entregada"},
    },
)
def reportar_devolucion(pedido_id: int, proveedor_id: int, datos: ReportarDevolucion):
    return _errores(repository.reportar_devolucion, pedido_id, proveedor_id, datos)


@router.post(
    "/{pedido_id}/cancelar",
    response_model=PedidoResponse,
    summary="Cancelar un pedido",
    description=(
        "El cliente cancela su pedido mientras está pendiente (sin pagar). Devuelve el stock de todos los "
        "productos y pasa el pedido y todas sus partes a cancelado."
    ),
    responses={
        403: {"description": "El pedido no es de ese usuario"},
        404: {"description": "Pedido no encontrado"},
        409: {"description": "El pedido no está pendiente"},
    },
)
def cancelar_pedido(pedido_id: int, datos: CancelarPedido):
    return _errores(repository.cancelar, pedido_id, datos)

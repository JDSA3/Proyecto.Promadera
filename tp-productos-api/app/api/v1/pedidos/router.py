from fastapi import APIRouter, HTTPException, status

from . import repository
from .schemas import PedidoCreate, PedidoResponse

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])


@router.get(
    "",
    response_model=list[PedidoResponse],
    summary="Listar pedidos",
    description=(
        "Devuelve los pedidos, del más nuevo al más viejo. Con cliente_id muestra los pedidos de ese cliente. "
        "Con proveedor_id muestra los pedidos que tienen productos de ese proveedor: solo aparecen sus items "
        "y el total es la suma de esos items."
    ),
)
def listar_pedidos(cliente_id: int | None = None, proveedor_id: int | None = None):
    return repository.list_pedidos(cliente_id, proveedor_id)


@router.get(
    "/{pedido_id}",
    response_model=PedidoResponse,
    summary="Obtener un pedido por ID",
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
        "Si hay stock de todos los productos, lo descuenta; si falta stock de alguno, no se guarda nada."
    ),
    responses={
        400: {"description": "El cliente o algún producto no existe (o el usuario no es cliente)"},
        409: {"description": "No hay stock suficiente de algún producto"},
    },
)
def crear_pedido(datos: PedidoCreate):
    try:
        return repository.create(datos)
    except repository.DatosInvalidos as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))
    except repository.StockInsuficiente as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))

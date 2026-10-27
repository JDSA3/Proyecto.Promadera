from typing import Literal

from fastapi import APIRouter, HTTPException, status

from . import repository
from .schemas import (
    OrdenCompraCreate,
    OrdenCompraResponse,
    ProveedorInsumoCreate,
    ProveedorInsumoResponse,
    ProveedorInsumoUpdate,
    RecibirOrden,
)

proveedores_router = APIRouter(prefix="/proveedores-insumo", tags=["Compras del corralón"])
ordenes_router = APIRouter(prefix="/ordenes-compra", tags=["Compras del corralón"])


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


@proveedores_router.get(
    "",
    response_model=list[ProveedorInsumoResponse],
    summary="Listar proveedores de insumos",
    description="Devuelve los proveedores a los que les compran los corralones. Con corralon_id, solo los de ese corralón.",
)
def listar_proveedores(corralon_id: int | None = None):
    return repository.list_proveedores(corralon_id)


@proveedores_router.post(
    "",
    response_model=ProveedorInsumoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un proveedor de insumos",
    description="Agrega un proveedor a la lista de un corralón.",
    responses={400: {"description": "El corralon_id no es un corralón"}},
)
def crear_proveedor(datos: ProveedorInsumoCreate):
    return _errores(repository.create_proveedor, datos)


@proveedores_router.put(
    "/{proveedor_id}",
    response_model=ProveedorInsumoResponse,
    summary="Editar un proveedor de insumos",
    description="Cambia el nombre, teléfono y email. Solo lo puede editar el corralón dueño.",
    responses={403: {"description": "El proveedor no es de ese corralón"}, 404: {"description": "Proveedor no encontrado"}},
)
def editar_proveedor(proveedor_id: int, datos: ProveedorInsumoUpdate):
    return _errores(repository.update_proveedor, proveedor_id, datos)


@proveedores_router.delete(
    "/{proveedor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Borrar un proveedor de insumos",
    description=(
        "Baja lógica: el proveedor deja de aparecer y no se le pueden hacer órdenes nuevas, "
        "pero sus órdenes viejas se conservan. usuario_id es el corralón dueño."
    ),
    responses={403: {"description": "El proveedor no es de ese corralón"}, 404: {"description": "Proveedor no encontrado"}},
)
def borrar_proveedor(proveedor_id: int, usuario_id: int):
    _errores(repository.delete_proveedor, proveedor_id, usuario_id)


@ordenes_router.get(
    "",
    response_model=list[OrdenCompraResponse],
    summary="Listar órdenes de compra",
    description="Devuelve las órdenes de compra, de la más nueva a la más vieja. Se puede filtrar por corralon_id y estado.",
)
def listar_ordenes(corralon_id: int | None = None, estado: Literal["pendiente", "recibida"] | None = None):
    return repository.list_ordenes(corralon_id, estado)


@ordenes_router.post(
    "",
    response_model=OrdenCompraResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una orden de compra",
    description=(
        "El corralón le pide productos a uno de sus proveedores. Queda pendiente y el stock no cambia "
        "hasta recibirla. Los productos tienen que ser del corralón."
    ),
    responses={400: {"description": "El corralón, el proveedor o algún producto no corresponde"}},
)
def crear_orden(datos: OrdenCompraCreate):
    return _errores(repository.create_orden, datos)


@ordenes_router.patch(
    "/{orden_id}/recibir",
    response_model=OrdenCompraResponse,
    summary="Recibir una orden de compra",
    description="Marca la orden como recibida y suma las cantidades al stock de cada producto.",
    responses={
        403: {"description": "La orden no es de ese corralón"},
        404: {"description": "Orden no encontrada"},
        409: {"description": "La orden ya fue recibida"},
    },
)
def recibir_orden(orden_id: int, datos: RecibirOrden):
    return _errores(repository.recibir, orden_id, datos)

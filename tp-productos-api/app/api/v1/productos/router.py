from fastapi import APIRouter, HTTPException, status

from . import repository

from app.api.v1.productos.schemas import (
    ProductoCreate,
    ProductoUpdate,
    ProductoResponse,
)

router = APIRouter(prefix="/productos", tags=["Productos"])


@router.get(
    "",
    response_model=list[ProductoResponse],
    summary="Listar productos",
    description="Devuelve la lista de productos. Permite filtrar por texto en el nombre (query) y/o por categoria_id.",
)
def listar_productos(
    query: str | None = None,
    categoria_id: int | None = None
):
    if query is not None:
        productos = repository.search_by_nombre(query)
    else:
        productos = repository.list_productos()

    if categoria_id is not None:
        productos = [
            producto
            for producto in productos
            if producto["categoria"]["id"] == categoria_id
        ]

    return productos


@router.get(
    "/{producto_id}",
    response_model=ProductoResponse,
    summary="Obtener un producto por ID",
    description="Devuelve los datos de un producto especifico segun su ID.",
    responses={404: {"description": "Producto no encontrado"}},
)
def obtener_producto(producto_id: int):
    producto = repository.get_by_id(producto_id)

    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto {producto_id} no encontrado",
        )
    return producto


@router.post(
    "",
    response_model=ProductoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un producto",
    description="Crea un nuevo producto. La categoria_id debe corresponder a una categoria existente.",
    responses={400: {"description": "La categoria indicada no existe"}},
)
def crear_producto(datos: ProductoCreate):
    existe, mensaje = repository.ensure_categoria(
        datos.categoria_id
    )
    if not existe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensaje,
        )
    return repository.create(datos)


@router.put(
    "/{producto_id}",
    response_model=ProductoResponse,
    summary="Actualizar un producto",
    description="Actualiza uno o mas campos de un producto existente. Los campos no enviados, o enviados en null, no se modifican.",
    responses={
        404: {"description": "Producto no encontrado"},
        400: {"description": "La categoria indicada no existe"},
    },
)
def actualizar_producto(
    producto_id: int,
    datos: ProductoUpdate
):
    producto = repository.get_by_id(producto_id)
    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto {producto_id} no encontrado",
        )
    cambios = datos.model_dump(exclude_unset=True)
    if "categoria_id" in cambios:
        existe, mensaje = repository.ensure_categoria(
            cambios["categoria_id"]
        )
        if not existe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=mensaje,
            )
    return repository.update(producto_id, datos)


@router.delete(
    "/{producto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un producto",
    description="Elimina (desactiva) un producto existente por su ID.",
    responses={404: {"description": "Producto no encontrado"}},
)
def eliminar_producto(producto_id: int):
    producto = repository.delete(producto_id)
    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto {producto_id} no encontrado",
        )
from fastapi import APIRouter, HTTPException, status

from . import repository

from app.api.v1.productos.schemas import (
ProductoCreate,
ProductoUpdate,
ProductoResponse,
)

router = APIRouter(prefix="/productos", tags=["Productos"])

@router.get("", response_model=list[ProductoResponse])
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


@router.get("/{producto_id}", response_model=ProductoResponse)
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


@router.put("/{producto_id}", response_model=ProductoResponse)
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
)
def eliminar_producto(producto_id: int):
    producto = repository.delete(producto_id)
    if producto is None:
        raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Producto {producto_id} no encontrado",
    )


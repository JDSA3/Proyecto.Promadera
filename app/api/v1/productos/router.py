from fastapi import APIRouter, HTTPException, status

from app.core.db import categorias, productos, bump_producto_id
from app.models import Producto
from app.api.v1.productos.schemas import (
    ProductoCreate,
    ProductoUpdate,
    ProductoResponse,
    CategoriaOut,
)

router = APIRouter(prefix="/productos", tags=["Productos"])


def _buscar_categoria(categoria_id: int) -> CategoriaOut:
    categoria = next((c for c in categorias if c.id == categoria_id), None)
    if categoria is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La categoria_id {categoria_id} no existe",
        )
    return CategoriaOut(id=categoria.id, nombre=categoria.nombre)


def _a_response(producto: Producto) -> ProductoResponse:
    categoria = _buscar_categoria(producto.categoria_id)
    return ProductoResponse(
        id=producto.id,
        nombre=producto.nombre,
        precio=producto.precio,
        stock=producto.stock,
        activo=producto.activo,
        categoria=categoria,
    )


def _buscar_producto(producto_id: int) -> Producto:
    producto = next((p for p in productos if p.id == producto_id), None)
    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto {producto_id} no encontrado",
        )
    return producto


@router.get("", response_model=list[ProductoResponse])
def listar_productos():
    return [_a_response(p) for p in productos]


@router.get("/{producto_id}", response_model=ProductoResponse)
def obtener_producto(producto_id: int):
    producto = _buscar_producto(producto_id)
    return _a_response(producto)


@router.post("", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
def crear_producto(datos: ProductoCreate):
    # Valida que la categoria exista antes de crear el producto
    _buscar_categoria(datos.categoria_id)

    nuevo_id = bump_producto_id()
    nuevo_producto = Producto(
        id=nuevo_id,
        nombre=datos.nombre,
        precio=datos.precio,
        categoria_id=datos.categoria_id,
        stock=datos.stock,
        activo=True,
    )
    productos.append(nuevo_producto)
    return _a_response(nuevo_producto)


@router.put("/{producto_id}", response_model=ProductoResponse)
def actualizar_producto(producto_id: int, datos: ProductoUpdate):
    producto = _buscar_producto(producto_id)

    # Solo pisa los campos que vinieron en el body (PUT parcial)
    cambios = datos.model_dump(exclude_unset=True)

    if "categoria_id" in cambios:
        _buscar_categoria(cambios["categoria_id"])

    for campo, valor in cambios.items():
        setattr(producto, campo, valor)

    return _a_response(producto)


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto(producto_id: int):
    producto = _buscar_producto(producto_id)
    producto.activo = False  # borrado logico, no se quita de la lista
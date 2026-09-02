from app.core import db
from app.models import Producto

def _find_categoria(categoria_id: int):
    return next(
        (categoria for categoria in db.categorias
         if categoria.id == categoria_id),
        None
    )
def _to_dict(producto: Producto):
    categoria = _find_categoria(producto.categoria_id)

    return {
        "id": producto.id,
        "nombre": producto.nombre,
        "precio": producto.precio,
        "stock": producto.stock,
        "activo": producto.activo,
        "categoria": {
            "id": categoria.id,
            "nombre": categoria.nombre,
        } if categoria else None,
    }
def list_productos():
    return [_to_dict(producto) for producto in db.productos]
def get_by_id(producto_id: int):
    producto = next(
        (producto for producto in db.productos
         if producto.id == producto_id),
        None
    )

    if producto is None:
        return None

    return _to_dict(producto)
def search_by_nombre(query: str):
    query = query.lower()

    return [
        _to_dict(producto)
        for producto in db.productos
        if query in producto.nombre.lower()
    ]
def ensure_categoria(categoria_id: int):
    categoria = _find_categoria(categoria_id)

    if categoria is None:
        return False, f"La categoria {categoria_id} no existe"

    return True, None
def create(data):
    datos = data.model_dump(exclude_unset=True)

    nuevo_producto = Producto(
        id=db.bump_producto_id(),
        nombre=datos["nombre"],
        precio=datos["precio"],
        stock=datos["stock"],
        categoria_id=datos["categoria_id"],
        activo=True,
    )

    db.productos.append(nuevo_producto)

    return _to_dict(nuevo_producto)
def update(producto_id: int, data):
    producto = next(
        (
            producto
            for producto in db.productos
            if producto.id == producto_id
        ),
        None
    )

    if producto is None:
        return None

    cambios = data.model_dump(exclude_unset=True)

    for campo, valor in cambios.items():
        setattr(producto, campo, valor)

    return _to_dict(producto)
def delete(producto_id: int):
    producto = next(
        (
            producto
            for producto in db.productos
            if producto.id == producto_id and producto.activo
        ),
        None
    )

    if producto is None:
        return None

    producto.activo = False

    return _to_dict(producto)
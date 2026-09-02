from app.models import Categoria, Producto

categorias: list[Categoria] = [
    Categoria(id=1, nombre="Maderas y Tableros"),
    Categoria(id=2, nombre="Herrajes"),
    Categoria(id=3, nombre="Insumos"),
    Categoria(id=4, nombre="Herramientas")
]

productos: list[Producto] = [
    Producto(id=1, nombre="Placa melamina MDF 18mm 1.83x2.60m", precio=95700, categoria_id=1),
    Producto(id=2, nombre="Placa melamina MDF 15mm 260x183cm", precio=90000.0, categoria_id=1),
    Producto(id=3, nombre="Bisagra bayoneta 35mm", precio=1292.0, categoria_id=2),
    Producto(id=4, nombre="Corredera telescópica 45cm", precio=7750.0, categoria_id=2),
    Producto(id=5, nombre="Tapacanto metalico 2,5m ", precio=10421.0, categoria_id=3),
    Producto(id=6, nombre="Disco para Sierra Circular 7 1/4 24 Dientes TCT Kwb", precio=14432.0, categoria_id=3),
    Producto(id=7, nombre="Sierra Circular 184 Mm 1400 W 5300 Rpm Black & Decker", precio=138.120, categoria_id=4),
]

_ultimo_id_producto: int = len(productos)


def bump_producto_id() -> int:
    global _ultimo_id_producto
    _ultimo_id_producto += 1
    return _ultimo_id_producto
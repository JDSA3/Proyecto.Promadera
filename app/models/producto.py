from dataclasses import dataclass


@dataclass
class Producto:
    id: int
    nombre: str
    precio: float
    categoria_id: int
    stock: int = 0
    activo: bool = True
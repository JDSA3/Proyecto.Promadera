from pydantic import BaseModel


class ProductoVendido(BaseModel):
    producto_id: int
    nombre: str
    cantidad: int
    total: float


class ProductoStockBajo(BaseModel):
    producto_id: int
    nombre: str
    stock: int


class ResumenCorralon(BaseModel):
    corralon_id: int
    corralon_nombre: str
    mes: str
    ventas_mes: float
    pedidos_mes: int
    pedidos_pendientes: int
    pedidos_por_estado: dict[str, int]
    mas_vendidos: list[ProductoVendido]
    stock_bajo: list[ProductoStockBajo]

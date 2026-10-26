from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Estado = Literal["pendiente", "pagado", "cancelado"]
EstadoCorralon = Literal["pendiente", "confirmado", "enviado", "entregado", "devuelto", "cancelado"]


class PedidoItemCreate(BaseModel):
    producto_id: int = Field(ge=1)
    cantidad: int = Field(ge=1)


class PedidoCreate(BaseModel):
    cliente_id: int = Field(ge=1)
    items: list[PedidoItemCreate] = Field(min_length=1)


class ClienteOut(BaseModel):
    id: int
    nombre: str


class PedidoItemResponse(BaseModel):
    producto_id: int
    nombre: str
    proveedor_id: int | None = None
    cantidad: int
    precio_unitario: float
    subtotal: float


class CorralonPedidoResponse(BaseModel):
    proveedor_id: int | None = None
    proveedor_nombre: str | None = None
    estado: EstadoCorralon
    total: float
    motivo_devolucion: str | None = None
    items: list[PedidoItemResponse]


class PedidoResponse(BaseModel):
    id: int
    estado: Estado
    total: float
    creado_en: datetime
    cliente: ClienteOut
    items: list[PedidoItemResponse]
    corralones: list[CorralonPedidoResponse]

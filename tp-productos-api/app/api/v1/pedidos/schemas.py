from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Estado = Literal["pendiente", "pagado", "cancelado"]
EstadoCorralon = Literal["pendiente", "confirmado", "enviado", "entregado", "devuelto", "cancelado"]


class PedidoItemCreate(BaseModel):
    producto_id: int = Field(ge=1)
    cantidad: int = Field(ge=1)
    largo_cm: float | None = Field(
        default=None,
        gt=0,
        description="Largo del corte en cm. Vacío = pieza entera. No puede ser mayor que el largo del producto.",
    )


class PedidoCreate(BaseModel):
    cliente_id: int = Field(ge=1)
    items: list[PedidoItemCreate] = Field(min_length=1)


class CambioEstadoCorralon(BaseModel):
    usuario_id: int = Field(ge=1, description="El corralón que hace el cambio (sin login todavía)")
    estado: Literal["confirmado", "enviado", "entregado", "devuelto"]
    motivo: str | None = Field(default=None, max_length=300, description="Obligatorio si el estado es devuelto")


class ReportarDevolucion(BaseModel):
    usuario_id: int = Field(ge=1, description="El cliente dueño del pedido (sin login todavía)")
    motivo: str = Field(min_length=1, max_length=300, description="Qué problema tuvo el material")


class CancelarPedido(BaseModel):
    usuario_id: int = Field(ge=1, description="El cliente dueño del pedido (sin login todavía)")


class ClienteOut(BaseModel):
    id: int
    nombre: str


class PedidoItemResponse(BaseModel):
    producto_id: int
    nombre: str
    proveedor_id: int | None = None
    cantidad: int
    largo_cm: float | None = None
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

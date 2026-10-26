from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ProveedorInsumoCreate(BaseModel):
    corralon_id: int = Field(ge=1)
    nombre: str = Field(min_length=1, max_length=100)
    telefono: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=255)


class ProveedorInsumoResponse(BaseModel):
    id: int
    corralon_id: int
    nombre: str
    telefono: str | None = None
    email: str | None = None


class OrdenCompraItemCreate(BaseModel):
    producto_id: int = Field(ge=1)
    cantidad: int = Field(ge=1)


class OrdenCompraCreate(BaseModel):
    corralon_id: int = Field(ge=1)
    proveedor_insumo_id: int = Field(ge=1)
    items: list[OrdenCompraItemCreate] = Field(min_length=1)


class RecibirOrden(BaseModel):
    usuario_id: int = Field(ge=1, description="El corralón que recibe la orden (sin login todavía)")


class ProveedorOut(BaseModel):
    id: int
    nombre: str


class OrdenCompraItemResponse(BaseModel):
    producto_id: int
    nombre: str
    cantidad: int
    stock_actual: int


class OrdenCompraResponse(BaseModel):
    id: int
    corralon_id: int
    estado: Literal["pendiente", "recibida"]
    creado_en: datetime
    recibida_en: datetime | None = None
    proveedor: ProveedorOut
    items: list[OrdenCompraItemResponse]

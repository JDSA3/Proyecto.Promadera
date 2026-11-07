from typing import Literal

from pydantic import BaseModel, Field

EstadoCorralon = Literal["pendiente", "aprobado", "rechazado"]


class CorralonResponse(BaseModel):
    id: int
    nombre: str
    email: str
    telefono: str | None = None
    activo: bool
    estado: EstadoCorralon


class CorralonEditar(BaseModel):
    """Se envían los cuatro campos completos (el formulario del panel los manda siempre)."""

    nombre: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    telefono: str | None = Field(default=None, max_length=20)
    activo: bool


class MetodoPagoStat(BaseModel):
    metodo: str
    cantidad: int
    monto: float


class EstadisticasPagosResponse(BaseModel):
    metodos: list[MetodoPagoStat]
    total_pedidos_pagados: int
    total_monto: float

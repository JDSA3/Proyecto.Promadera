from pydantic import BaseModel, Field
from typing import Optional


class ProductoBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    precio: float = Field(ge=0)


class ProductoCreate(ProductoBase):
    stock: int = Field(ge=0)
    categoria_id: int = Field(ge=1)
    proveedor_id: Optional[int] = Field(default=None, ge=1)
    nombre: str = Field(min_length=2, max_length=100)
    precio: float = Field(ge=0)
    largo_cm: Optional[float] = Field(default=None, ge=0)
    ancho_cm: Optional[float] = Field(default=None, ge=0)
    espesor_mm: Optional[float] = Field(default=None, ge=0)


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=100)
    precio: Optional[float] = Field(default=None, ge=0)
    stock: Optional[int] = Field(default=None, ge=0)
    categoria_id: Optional[int] = Field(default=None, ge=1)
    largo_cm: Optional[float] = Field(default=None, ge=0)
    ancho_cm: Optional[float] = Field(default=None, ge=0)
    espesor_mm: Optional[float] = Field(default=None, ge=0)


class CategoriaOut(BaseModel):
    id: int
    nombre: str


class ProductoResponse(ProductoBase):
    id: int
    stock: int
    activo: bool
    categoria: CategoriaOut
    proveedor_id: Optional[int] = None
    nombre: str
    precio: float
    largo_cm: Optional[float] = None
    ancho_cm: Optional[float] = None
    espesor_mm: Optional[float] = None
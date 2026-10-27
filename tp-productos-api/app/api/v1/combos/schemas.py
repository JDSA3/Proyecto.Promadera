from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ComboItemCreate(BaseModel):
    producto_id: int = Field(ge=1)
    cantidad: int = Field(ge=1, le=999)


class ComboCreate(BaseModel):
    autor_id: int = Field(ge=1, description="El carpintero que arma el combo (sin login todavía)")
    titulo: str = Field(min_length=2, max_length=100)
    descripcion: str = Field(default="", max_length=500)
    imagen: str | None = Field(
        default=None,
        max_length=700_000,
        description="Foto de portada: una URL o una imagen en base64 (data:image/...)",
    )
    items: list[ComboItemCreate] = Field(min_length=1, max_length=30)

    @field_validator("imagen")
    @classmethod
    def imagen_valida(cls, valor):
        if valor is None or valor == "":
            return None
        if not valor.startswith(("data:image/", "http://", "https://")):
            raise ValueError("La imagen tiene que ser una URL o una imagen en base64 (data:image/...)")
        return valor


class ComboItemResponse(BaseModel):
    producto_id: int
    nombre: str
    precio: float
    cantidad: int
    subtotal: float
    stock: int
    disponible: bool
    proveedor_id: int | None = None
    proveedor_nombre: str | None = None


class ComboResponse(BaseModel):
    id: int
    titulo: str
    descripcion: str
    imagen: str | None = None
    oficial: bool
    autor_id: int | None = None
    autor_nombre: str
    creado_en: datetime
    total: float
    disponible: bool
    items: list[ComboItemResponse]

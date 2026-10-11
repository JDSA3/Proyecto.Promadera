from typing import Literal

from pydantic import BaseModel, EmailStr, Field

Rol = Literal["cliente", "proveedor"]


class UsuarioRegistro(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    rol: Rol


class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str


class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    email: EmailStr
    rol: Rol

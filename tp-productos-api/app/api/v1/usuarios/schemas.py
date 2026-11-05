from typing import Literal

from pydantic import BaseModel, EmailStr, Field

# En el registro solo se puede elegir cliente o proveedor: nadie se hace admin desde la app.
RolRegistro = Literal["cliente", "proveedor"]
# En las respuestas puede aparecer también admin (se asigna a mano en la base).
Rol = Literal["cliente", "proveedor", "admin"]


class UsuarioRegistro(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    rol: RolRegistro


class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str


class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    email: EmailStr
    rol: Rol


class UsuarioAdminResponse(UsuarioResponse):
    activo: bool

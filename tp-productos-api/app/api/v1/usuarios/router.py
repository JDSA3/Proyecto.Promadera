from fastapi import APIRouter, HTTPException, status

from . import repository
from .schemas import UsuarioLogin, UsuarioRegistro, UsuarioResponse

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.post(
    "/registro",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un usuario",
    description="Crea un usuario nuevo con rol cliente o proveedor. La contraseña se guarda hasheada.",
    responses={409: {"description": "Ya existe un usuario con ese email"}},
)
def registrar_usuario(datos: UsuarioRegistro):
    usuario = repository.registrar(datos)

    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese email",
        )
    return usuario


@router.post(
    "/login",
    response_model=UsuarioResponse,
    summary="Iniciar sesion",
    description="Verifica email y contraseña. Si son correctos, devuelve los datos del usuario y su rol.",
    responses={401: {"description": "Email o contraseña incorrectos"}},
)
def login(datos: UsuarioLogin):
    usuario = repository.autenticar(datos.email, datos.password)

    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    return usuario

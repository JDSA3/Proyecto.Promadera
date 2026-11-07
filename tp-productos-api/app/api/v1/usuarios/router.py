from fastapi import APIRouter, HTTPException, Query, status

from . import repository
from .schemas import UsuarioAdminResponse, UsuarioLogin, UsuarioRegistro, UsuarioResponse

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])
admin_router = APIRouter(prefix="/admin/usuarios", tags=["Usuarios Admin"])


@router.get(
    "",
    response_model=list[UsuarioAdminResponse],
    summary="Listar usuarios (solo administrador)",
    description=(
        "Devuelve todos los usuarios con su rol y si están activos. usuario_id tiene que ser un administrador. "
        "No hay login con token todavía: el usuario se pasa como parámetro."
    ),
    responses={403: {"description": "El usuario no es administrador"}},
)
def listar_usuarios(
    usuario_id: int = Query(ge=1, description="El administrador que consulta (sin login todavía)"),
):
    if not repository.es_admin(usuario_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un administrador puede ver los usuarios",
        )
    return repository.listar()


@router.post(
    "/registro",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un usuario",
    description=(
        "Crea un usuario nuevo con rol cliente o proveedor. La contraseña se guarda hasheada. "
        "Los proveedores (corralones) quedan pendientes hasta que el administrador los apruebe."
    ),
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
    responses={
        401: {"description": "Email o contraseña incorrectos"},
        403: {"description": "Corralón pendiente de aprobación o rechazado"},
    },
)
def login(datos: UsuarioLogin):
    try:
        usuario = repository.autenticar(datos.email, datos.password)
    except repository.CuentaNoHabilitada as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error))

    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    return usuario

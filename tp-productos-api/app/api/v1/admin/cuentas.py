import re

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.api.v1.usuarios import repository as usuarios
from poc_postgresql.database import SessionLocal
from poc_postgresql.models import CorralonPerfilDB, PedidoDB, ProductoDB, UsuarioDB

router = APIRouter(prefix="/admin/cuentas", tags=["Administración"])


class CarpinteroResponse(BaseModel):
    id: int
    nombre: str
    email: str
    telefono: str | None = None
    activo: bool
    cantidad_pedidos: int


class CarpinteroEditar(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    telefono: str | None = Field(default=None, max_length=30)
    activo: bool


class CorralonCuentaResponse(BaseModel):
    id: int
    nombre: str
    email: str
    telefono: str | None = None
    activo: bool
    estado: str
    nombre_comercial: str | None = None
    cuit: str | None = None
    direccion: str | None = None
    tiene_logo: bool
    cantidad_productos: int


def _exigir_admin(usuario_id: int) -> None:
    if not usuarios.es_admin(usuario_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un administrador puede hacer esto",
        )


@router.get(
    "/carpinteros",
    response_model=list[CarpinteroResponse],
    summary="Listar carpinteros con sus datos (solo administrador)",
    description="Cuentas con rol cliente (carpinteros), con su teléfono y la cantidad de pedidos que hicieron.",
    responses={403: {"description": "El usuario no es administrador"}},
)
def listar_carpinteros(usuario_id: int = Query(ge=1, description="El administrador que consulta (sin login todavía)")):
    _exigir_admin(usuario_id)

    with SessionLocal() as session:
        pedidos = (
            select(PedidoDB.cliente_id, func.count(PedidoDB.id).label("n"))
            .group_by(PedidoDB.cliente_id)
            .subquery()
        )
        filas = session.execute(
            select(UsuarioDB, func.coalesce(pedidos.c.n, 0))
            .outerjoin(pedidos, pedidos.c.cliente_id == UsuarioDB.id)
            .where(UsuarioDB.rol == "cliente")
            .order_by(UsuarioDB.id)
        ).all()

        return [
            {
                "id": u.id,
                "nombre": u.nombre,
                "email": u.email,
                "telefono": u.telefono,
                "activo": bool(u.activo),
                "cantidad_pedidos": int(n),
            }
            for u, n in filas
        ]


@router.put(
    "/carpinteros/{carpintero_id}",
    response_model=CarpinteroResponse,
    summary="Editar un carpintero (solo administrador)",
    description="Cambia nombre, email, teléfono y si está activo. Una cuenta inactiva no puede iniciar sesión.",
    responses={
        403: {"description": "El usuario no es administrador"},
        404: {"description": "Carpintero no encontrado"},
        409: {"description": "Ya existe otro usuario con ese email"},
        422: {"description": "Email o teléfono inválidos"},
    },
)
def editar_carpintero(
    carpintero_id: int,
    datos: CarpinteroEditar,
    usuario_id: int = Query(ge=1, description="El administrador que edita (sin login todavía)"),
):
    _exigir_admin(usuario_id)

    email = datos.email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El email no es válido")

    telefono = re.sub(r"[\s\-]", "", datos.telefono or "") or None
    if telefono is not None and not re.fullmatch(r"[0-9]{8,15}", telefono):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El teléfono tiene que tener entre 8 y 15 números, sin espacios ni guiones",
        )

    nombre = datos.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El nombre es obligatorio")

    with SessionLocal() as session:
        usuario = session.get(UsuarioDB, carpintero_id)
        if usuario is None or usuario.rol != "cliente":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carpintero no encontrado")

        otro = session.scalar(select(UsuarioDB).where(UsuarioDB.email == email, UsuarioDB.id != carpintero_id))
        if otro is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe otro usuario con ese email")

        usuario.nombre = nombre
        usuario.email = email
        usuario.telefono = telefono
        usuario.activo = datos.activo

        cantidad = session.scalar(select(func.count(PedidoDB.id)).where(PedidoDB.cliente_id == carpintero_id)) or 0
        resultado = {
            "id": usuario.id,
            "nombre": usuario.nombre,
            "email": usuario.email,
            "telefono": usuario.telefono,
            "activo": bool(usuario.activo),
            "cantidad_pedidos": int(cantidad),
        }
        session.commit()
        return resultado


@router.get(
    "/corralones",
    response_model=list[CorralonCuentaResponse],
    summary="Listar corralones con sus datos comerciales (solo administrador)",
    description=(
        "Cuentas con rol proveedor: datos de contacto, estado de la cuenta, datos comerciales del perfil "
        "(nombre comercial, CUIT, dirección), si subió logo y cuántos productos activos tiene. "
        "Para editar nombre, email, teléfono o activo se usa PUT /admin/corralones/{id}."
    ),
    responses={403: {"description": "El usuario no es administrador"}},
)
def listar_corralones(usuario_id: int = Query(ge=1, description="El administrador que consulta (sin login todavía)")):
    _exigir_admin(usuario_id)

    with SessionLocal() as session:
        productos = (
            select(ProductoDB.proveedor_id, func.count(ProductoDB.id).label("n"))
            .where(ProductoDB.activo)
            .group_by(ProductoDB.proveedor_id)
            .subquery()
        )
        filas = session.execute(
            select(
                UsuarioDB,
                CorralonPerfilDB.nombre_comercial,
                CorralonPerfilDB.cuit,
                CorralonPerfilDB.direccion,
                CorralonPerfilDB.telefono,
                CorralonPerfilDB.logo.is_not(None),
                func.coalesce(productos.c.n, 0),
            )
            .outerjoin(CorralonPerfilDB, CorralonPerfilDB.usuario_id == UsuarioDB.id)
            .outerjoin(productos, productos.c.proveedor_id == UsuarioDB.id)
            .where(UsuarioDB.rol == "proveedor")
            .order_by(UsuarioDB.id)
        ).all()

        return [
            {
                "id": u.id,
                "nombre": u.nombre,
                "email": u.email,
                "telefono": telefono_perfil or u.telefono,
                "activo": bool(u.activo),
                "estado": u.estado,
                "nombre_comercial": nombre_comercial,
                "cuit": cuit,
                "direccion": direccion,
                "tiene_logo": bool(tiene_logo),
                "cantidad_productos": int(n),
            }
            for u, nombre_comercial, cuit, direccion, telefono_perfil, tiene_logo, n in filas
        ]

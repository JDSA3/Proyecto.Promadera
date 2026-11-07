import re

from fastapi import APIRouter, HTTPException, Query, status

from app.api.v1.usuarios import repository as usuarios

from . import repository
from .schemas import (
    CorralonEditar,
    CorralonResponse,
    EstadisticasPagosResponse,
    EstadoCorralon,
)

router = APIRouter(prefix="/admin", tags=["Administración"])


def _exigir_admin(usuario_id: int) -> None:
    if not usuarios.es_admin(usuario_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un administrador puede hacer esto",
        )


def _corralon_o_404(corralon):
    if corralon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Corralón no encontrado",
        )
    return corralon


@router.get(
    "/corralones",
    response_model=list[CorralonResponse],
    summary="Listar corralones (solo administrador)",
    description="Devuelve los usuarios con rol proveedor. Con estado se filtran las solicitudes (pendiente) o los aprobados.",
    responses={403: {"description": "El usuario no es administrador"}},
)
def listar_corralones(
    usuario_id: int = Query(ge=1, description="El administrador que consulta (sin login todavía)"),
    estado: EstadoCorralon | None = Query(default=None),
):
    _exigir_admin(usuario_id)
    return repository.listar_corralones(estado)


@router.put(
    "/corralones/{corralon_id}",
    response_model=CorralonResponse,
    summary="Editar un corralón (solo administrador)",
    description="Cambia nombre, email, teléfono y si está activo.",
    responses={
        403: {"description": "El usuario no es administrador"},
        404: {"description": "Corralón no encontrado"},
        409: {"description": "Ya existe otro usuario con ese email"},
        422: {"description": "Email o teléfono inválidos"},
    },
)
def editar_corralon(
    corralon_id: int,
    datos: CorralonEditar,
    usuario_id: int = Query(ge=1, description="El administrador que edita (sin login todavía)"),
):
    _exigir_admin(usuario_id)

    email = datos.email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El email no es válido",
        )

    telefono = (datos.telefono or "").strip() or None
    if telefono is not None and not re.fullmatch(r"[0-9]{8,15}", telefono):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El teléfono tiene que tener entre 8 y 15 números, sin espacios ni guiones",
        )

    try:
        corralon = repository.editar_corralon(corralon_id, datos.nombre, email, telefono, datos.activo)
    except repository.EmailEnUso:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe otro usuario con ese email",
        )

    return _corralon_o_404(corralon)


@router.post(
    "/corralones/{corralon_id}/aprobar",
    response_model=CorralonResponse,
    summary="Aprobar un corralón (solo administrador)",
    description="Pasa la solicitud a aprobada: el corralón ya puede iniciar sesión.",
    responses={
        403: {"description": "El usuario no es administrador"},
        404: {"description": "Corralón no encontrado"},
    },
)
def aprobar_corralon(
    corralon_id: int,
    usuario_id: int = Query(ge=1, description="El administrador (sin login todavía)"),
):
    _exigir_admin(usuario_id)
    return _corralon_o_404(repository.cambiar_estado(corralon_id, "aprobado"))


@router.post(
    "/corralones/{corralon_id}/rechazar",
    response_model=CorralonResponse,
    summary="Rechazar un corralón (solo administrador)",
    description="Pasa la solicitud a rechazada: el corralón no puede iniciar sesión.",
    responses={
        403: {"description": "El usuario no es administrador"},
        404: {"description": "Corralón no encontrado"},
    },
)
def rechazar_corralon(
    corralon_id: int,
    usuario_id: int = Query(ge=1, description="El administrador (sin login todavía)"),
):
    _exigir_admin(usuario_id)
    return _corralon_o_404(repository.cambiar_estado(corralon_id, "rechazado"))


@router.get(
    "/estadisticas/pagos",
    response_model=EstadisticasPagosResponse,
    summary="Estadísticas de pago por método (solo administrador)",
    description="Cantidad y monto de pedidos pagados, agrupados por método: efectivo, transferencia, tarjeta de crédito y otros.",
    responses={403: {"description": "El usuario no es administrador"}},
)
def estadisticas_pagos(
    usuario_id: int = Query(ge=1, description="El administrador que consulta (sin login todavía)"),
):
    _exigir_admin(usuario_id)
    return repository.estadisticas_pagos()

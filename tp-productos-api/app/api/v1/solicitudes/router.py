import re
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, Response, UploadFile, status

from app.api.v1.usuarios import repository as usuarios

from . import repository
from .schemas import (
    EstadoSolicitud,
    MiSolicitudResponse,
    RechazoRequest,
    SolicitudAdminResponse,
    SolicitudResponse,
    TipoComprobante,
)

router = APIRouter(prefix="/solicitudes-corralon", tags=["Solicitudes de corralón"])
admin_router = APIRouter(prefix="/admin/solicitudes-corralon", tags=["Administración"])

MAX_ARCHIVO_BYTES = 3 * 1024 * 1024  # 3 MB

EXTENSIONES = {"application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg"}


def _exigir_admin(usuario_id: int) -> None:
    if not usuarios.es_admin(usuario_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un administrador puede hacer esto",
        )


def _tipo_real(contenido: bytes) -> str | None:
    """Detecta el tipo mirando el contenido, sin confiar en lo que declara el navegador."""
    if contenido.startswith(b"%PDF-"):
        return "application/pdf"
    if contenido.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if contenido.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    return None


def _422(detalle: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detalle)


# ---------- Corralón ----------


@router.post(
    "",
    response_model=SolicitudResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enviar la solicitud para ser corralón",
    description=(
        "Formulario con archivo (multipart). Adjunta el comprobante de monotributo u otro de ARCA "
        "(PDF, PNG o JPG, hasta 3 MB). usuario_id tiene que ser un corralón todavía no aprobado "
        "(no hay login con token todavía)."
    ),
    responses={
        403: {"description": "El usuario no es un corralón"},
        409: {"description": "Ya está aprobado o ya tiene una solicitud en revisión"},
        413: {"description": "El archivo supera los 3 MB"},
        415: {"description": "El archivo no es PDF, PNG ni JPG"},
        422: {"description": "Datos inválidos"},
    },
)
def enviar_solicitud(
    usuario_id: int = Form(ge=1),
    nombre_comercial: str = Form(max_length=100),
    cuit: str = Form(max_length=20),
    telefono: str = Form(max_length=30),
    direccion: str = Form(max_length=200),
    tipo_comprobante: TipoComprobante = Form(),
    archivo: UploadFile = File(),
):
    nombre = nombre_comercial.strip()
    if len(nombre) < 2:
        raise _422("El nombre comercial es obligatorio")

    direccion = direccion.strip()
    if len(direccion) < 5:
        raise _422("La dirección es obligatoria")

    cuit_limpio = re.sub(r"\D", "", cuit)
    if len(cuit_limpio) != 11:
        raise _422("El CUIT tiene que tener 11 números")

    telefono_limpio = re.sub(r"[\s\-]", "", telefono)
    if not re.fullmatch(r"[0-9]{8,15}", telefono_limpio):
        raise _422("El teléfono tiene que tener entre 8 y 15 números")

    contenido = archivo.file.read(MAX_ARCHIVO_BYTES + 1)
    if not contenido:
        raise _422("El archivo está vacío")
    if len(contenido) > MAX_ARCHIVO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo no puede pesar más de 3 MB",
        )

    tipo = _tipo_real(contenido)
    if tipo is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="El comprobante tiene que ser un PDF, PNG o JPG",
        )

    nombre_archivo = Path(archivo.filename or "comprobante").name[:255] or "comprobante"

    try:
        return repository.crear(
            usuario_id,
            {
                "nombre_comercial": nombre,
                "cuit": cuit_limpio,
                "telefono": telefono_limpio,
                "direccion": direccion,
                "tipo_comprobante": tipo_comprobante,
            },
            contenido,
            nombre_archivo,
            tipo,
        )
    except repository.UsuarioNoEsCorralon:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un corralón puede enviar esta solicitud",
        )
    except repository.CuentaYaAprobada:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tu cuenta de corralón ya está aprobada",
        )
    except repository.SolicitudYaPendiente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya tenés una solicitud en revisión",
        )


@router.get(
    "/mia",
    response_model=MiSolicitudResponse,
    summary="Estado de mi cuenta y mi última solicitud",
    description="Devuelve si la cuenta del corralón está aprobada y su última solicitud (sin el archivo).",
    responses={
        403: {"description": "El usuario no es un corralón"},
        404: {"description": "Usuario no encontrado"},
    },
)
def mi_solicitud(usuario_id: int = Query(ge=1, description="El corralón que consulta (sin login todavía)")):
    try:
        datos = repository.mia(usuario_id)
    except repository.UsuarioNoEsCorralon:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un corralón tiene solicitud",
        )

    if datos is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return datos


# ---------- Administrador ----------


@admin_router.get(
    "",
    response_model=list[SolicitudAdminResponse],
    summary="Listar solicitudes de corralón (solo administrador)",
    description="Las más nuevas primero. Con estado se filtra (pendiente, aprobada, rechazada).",
    responses={403: {"description": "El usuario no es administrador"}},
)
def listar_solicitudes(
    usuario_id: int = Query(ge=1, description="El administrador que consulta (sin login todavía)"),
    estado: EstadoSolicitud | None = Query(default=None),
):
    _exigir_admin(usuario_id)
    return repository.listar(estado)


@admin_router.get(
    "/{solicitud_id}/archivo",
    summary="Ver el comprobante adjunto (solo administrador)",
    description="Devuelve el PDF o la imagen que adjuntó el corralón.",
    responses={
        403: {"description": "El usuario no es administrador"},
        404: {"description": "Solicitud no encontrada"},
    },
)
def ver_archivo(
    solicitud_id: int,
    usuario_id: int = Query(ge=1, description="El administrador que consulta (sin login todavía)"),
):
    _exigir_admin(usuario_id)

    resultado = repository.obtener_archivo(solicitud_id)
    if resultado is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")

    contenido, tipo = resultado
    extension = EXTENSIONES.get(tipo, "bin")
    return Response(
        content=contenido,
        media_type=tipo,
        headers={
            "Content-Disposition": f'inline; filename="comprobante-{solicitud_id}.{extension}"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@admin_router.post(
    "/{solicitud_id}/aprobar",
    response_model=SolicitudResponse,
    summary="Aprobar una solicitud (solo administrador)",
    description="Habilita al corralón (cuenta aprobada) y guarda sus datos comerciales.",
    responses={
        403: {"description": "El usuario no es administrador"},
        404: {"description": "Solicitud no encontrada"},
        409: {"description": "La solicitud ya fue resuelta"},
    },
)
def aprobar_solicitud(
    solicitud_id: int,
    usuario_id: int = Query(ge=1, description="El administrador (sin login todavía)"),
):
    _exigir_admin(usuario_id)

    try:
        solicitud = repository.aprobar(solicitud_id, usuario_id)
    except repository.SolicitudNoPendiente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La solicitud ya fue resuelta")

    if solicitud is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")
    return solicitud


@admin_router.post(
    "/{solicitud_id}/rechazar",
    response_model=SolicitudResponse,
    summary="Rechazar una solicitud (solo administrador)",
    description="Guarda el motivo. El corralón puede corregir y enviar otra solicitud.",
    responses={
        403: {"description": "El usuario no es administrador"},
        404: {"description": "Solicitud no encontrada"},
        409: {"description": "La solicitud ya fue resuelta"},
    },
)
def rechazar_solicitud(
    solicitud_id: int,
    datos: RechazoRequest,
    usuario_id: int = Query(ge=1, description="El administrador (sin login todavía)"),
):
    _exigir_admin(usuario_id)

    try:
        solicitud = repository.rechazar(solicitud_id, usuario_id, datos.motivo)
    except repository.SolicitudNoPendiente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La solicitud ya fue resuelta")

    if solicitud is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")
    return solicitud

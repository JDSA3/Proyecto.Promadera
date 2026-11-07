import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, File, Form, HTTPException, Query, Response, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import defer

from app.api.v1.usuarios import repository as usuarios
from poc_postgresql.database import SessionLocal
from poc_postgresql.models import CorralonPerfilDB, PedidoCorralonDB, PedidoDB, UsuarioDB

router = APIRouter(prefix="/corralones", tags=["Corralones"])

HORA_ARGENTINA = timezone(timedelta(hours=-3))
ESTADOS_QUE_NO_SON_VENTA = ("cancelado", "devuelto")
METODOS = ["efectivo", "transferencia", "tarjeta_credito", "otros"]
MAX_LOGO_BYTES = 1024 * 1024  # 1 MB


# ---------- Schemas ----------


class PerfilResponse(BaseModel):
    usuario_id: int
    nombre_comercial: str
    cuit: str | None = None
    telefono: str | None = None
    direccion: str | None = None
    tiene_logo: bool


class PerfilEditar(BaseModel):
    nombre_comercial: str = Field(min_length=2, max_length=100)
    telefono: str | None = Field(default=None, max_length=30)
    direccion: str | None = Field(default=None, max_length=200)


class VentaMetodo(BaseModel):
    metodo: str
    cantidad: int
    monto: float
    porcentaje: float


class VentaMes(BaseModel):
    mes: str
    cantidad: int
    monto: float


class EstadisticasCorralon(BaseModel):
    meses: int
    pedidos_total: int
    ventas_total: float
    ticket_promedio: float
    por_metodo: list[VentaMetodo]
    por_mes: list[VentaMes]


# ---------- Ayudas ----------


def _puede_ver(corralon_id: int, usuario_id: int) -> bool:
    """El propio corralón o un administrador."""
    if usuarios.es_admin(usuario_id):
        return True
    if usuario_id != corralon_id:
        return False
    with SessionLocal() as session:
        usuario = session.get(UsuarioDB, corralon_id)
        return usuario is not None and bool(usuario.activo) and usuario.rol == "proveedor"


def _exigir_dueno_aprobado(corralon_id: int, usuario_id: int) -> None:
    if usuario_id != corralon_id or not usuarios.proveedor_aprobado(usuario_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el corralón aprobado puede cambiar su perfil",
        )


def _perfil_dict(usuario: UsuarioDB, perfil: CorralonPerfilDB | None, tiene_logo: bool) -> dict:
    return {
        "usuario_id": usuario.id,
        "nombre_comercial": perfil.nombre_comercial if perfil is not None else usuario.nombre,
        "cuit": perfil.cuit if perfil is not None else None,
        "telefono": (perfil.telefono if perfil is not None else None) or usuario.telefono,
        "direccion": perfil.direccion if perfil is not None else None,
        "tiene_logo": tiene_logo,
    }


def _cargar(session, corralon_id: int):
    """Devuelve (usuario, perfil, tiene_logo) sin traer el logo completo a memoria."""
    usuario = session.get(UsuarioDB, corralon_id)
    if usuario is None or not usuario.activo or usuario.rol != "proveedor":
        return None, None, False

    perfil = session.get(CorralonPerfilDB, corralon_id, options=[defer(CorralonPerfilDB.logo)])
    tiene_logo = bool(
        session.scalar(
            select(CorralonPerfilDB.logo.is_not(None)).where(CorralonPerfilDB.usuario_id == corralon_id)
        )
    )
    return usuario, perfil, tiene_logo


def _tipo_logo(contenido: bytes) -> str | None:
    if contenido.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if contenido.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    return None


def obtener_logo(corralon_id: int) -> tuple[bytes, str] | None:
    """Para usar también desde el comprobante en PDF: (bytes, tipo) o None si no hay logo."""
    with SessionLocal() as session:
        perfil = session.get(CorralonPerfilDB, corralon_id)
        if perfil is None or perfil.logo is None:
            return None
        return bytes(perfil.logo), perfil.logo_tipo or "image/png"


def _estadisticas(corralon_id: int, meses: int) -> dict:
    # Meses a mostrar, del más viejo al actual (hora argentina)
    ahora = datetime.now(HORA_ARGENTINA)
    etiquetas = []
    anio, mes = ahora.year, ahora.month
    for _ in range(meses):
        etiquetas.append(f"{anio:04d}-{mes:02d}")
        mes -= 1
        if mes == 0:
            mes, anio = 12, anio - 1
    etiquetas.reverse()

    desde = datetime(int(etiquetas[0][:4]), int(etiquetas[0][5:]), 1, tzinfo=HORA_ARGENTINA)

    # Solo la parte de este corralón en pedidos pagados, sin cancelados ni devueltos
    condiciones = (
        PedidoCorralonDB.proveedor_id == corralon_id,
        PedidoDB.estado == "pagado",
        PedidoCorralonDB.estado.not_in(ESTADOS_QUE_NO_SON_VENTA),
        PedidoDB.creado_en >= desde,
    )
    monto = func.coalesce(func.sum(PedidoCorralonDB.total), 0)
    mes_local = func.to_char(func.timezone("America/Argentina/Buenos_Aires", PedidoDB.creado_en), "YYYY-MM")

    with SessionLocal() as session:
        filas_metodo = session.execute(
            select(PedidoDB.metodo_pago, func.count(PedidoCorralonDB.id), monto)
            .select_from(PedidoCorralonDB)
            .join(PedidoDB, PedidoDB.id == PedidoCorralonDB.pedido_id)
            .where(*condiciones)
            .group_by(PedidoDB.metodo_pago)
        ).all()

        filas_mes = session.execute(
            select(mes_local, func.count(PedidoCorralonDB.id), monto)
            .select_from(PedidoCorralonDB)
            .join(PedidoDB, PedidoDB.id == PedidoCorralonDB.pedido_id)
            .where(*condiciones)
            .group_by(mes_local)
        ).all()

    por_metodo = {m: {"cantidad": 0, "monto": 0.0} for m in METODOS}
    for metodo, cantidad, total in filas_metodo:
        if metodo in por_metodo:
            por_metodo[metodo] = {"cantidad": int(cantidad), "monto": float(total)}

    por_mes = {e: {"cantidad": 0, "monto": 0.0} for e in etiquetas}
    for etiqueta, cantidad, total in filas_mes:
        if etiqueta in por_mes:
            por_mes[etiqueta] = {"cantidad": int(cantidad), "monto": float(total)}

    pedidos_total = sum(d["cantidad"] for d in por_metodo.values())
    ventas_total = sum(d["monto"] for d in por_metodo.values())

    return {
        "meses": meses,
        "pedidos_total": pedidos_total,
        "ventas_total": round(ventas_total, 2),
        "ticket_promedio": round(ventas_total / pedidos_total, 2) if pedidos_total else 0.0,
        "por_metodo": [
            {
                "metodo": m,
                **d,
                "porcentaje": round(d["monto"] * 100 / ventas_total, 1) if ventas_total else 0.0,
            }
            for m, d in por_metodo.items()
        ],
        "por_mes": [{"mes": e, **d} for e, d in por_mes.items()],
    }


# ---------- Endpoints ----------


@router.get(
    "/{corralon_id}/perfil",
    response_model=PerfilResponse,
    summary="Perfil del corralón",
    description="Datos comerciales del corralón. Lo ve el propio corralón o un administrador (sin login todavía: usuario_id).",
    responses={403: {"description": "No es el corralón ni un administrador"}, 404: {"description": "Corralón no encontrado"}},
)
def obtener_perfil(corralon_id: int, usuario_id: int = Query(ge=1, description="Quien consulta (sin login todavía)")):
    if not _puede_ver(corralon_id, usuario_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No podés ver este perfil")

    with SessionLocal() as session:
        usuario, perfil, tiene_logo = _cargar(session, corralon_id)
        if usuario is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Corralón no encontrado")
        return _perfil_dict(usuario, perfil, tiene_logo)


@router.put(
    "/{corralon_id}/perfil",
    response_model=PerfilResponse,
    summary="Editar el perfil del corralón",
    description="Cambia nombre comercial, teléfono y dirección. El CUIT no se cambia desde acá. Solo el corralón aprobado.",
    responses={403: {"description": "No es el corralón aprobado"}, 422: {"description": "Datos inválidos"}},
)
def editar_perfil(
    corralon_id: int,
    datos: PerfilEditar,
    usuario_id: int = Query(ge=1, description="El corralón (sin login todavía)"),
):
    _exigir_dueno_aprobado(corralon_id, usuario_id)

    nombre = datos.nombre_comercial.strip()
    if len(nombre) < 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El nombre es obligatorio")

    telefono = re.sub(r"[\s\-]", "", datos.telefono or "") or None
    if telefono is not None and not re.fullmatch(r"[0-9]{8,15}", telefono):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El teléfono tiene que tener entre 8 y 15 números",
        )

    direccion = (datos.direccion or "").strip() or None

    with SessionLocal() as session:
        usuario, perfil, tiene_logo = _cargar(session, corralon_id)
        if usuario is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Corralón no encontrado")

        if perfil is None:
            perfil = CorralonPerfilDB(usuario_id=corralon_id, nombre_comercial=nombre)
            session.add(perfil)

        perfil.nombre_comercial = nombre
        perfil.telefono = telefono
        perfil.direccion = direccion
        usuario.telefono = telefono  # el panel admin muestra este teléfono

        resultado = _perfil_dict(usuario, perfil, tiene_logo)
        session.commit()
        return resultado


@router.put(
    "/{corralon_id}/logo",
    response_model=PerfilResponse,
    summary="Subir el logo del corralón",
    description="Formulario con archivo (multipart): PNG o JPG, hasta 1 MB. Es el logo que sale en el comprobante. Solo el corralón aprobado.",
    responses={
        403: {"description": "No es el corralón aprobado"},
        413: {"description": "El logo supera 1 MB"},
        415: {"description": "El logo no es PNG ni JPG"},
    },
)
def subir_logo(corralon_id: int, usuario_id: int = Form(ge=1), archivo: UploadFile = File()):
    _exigir_dueno_aprobado(corralon_id, usuario_id)

    contenido = archivo.file.read(MAX_LOGO_BYTES + 1)
    if not contenido:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El archivo está vacío")
    if len(contenido) > MAX_LOGO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El logo no puede pesar más de 1 MB",
        )

    tipo = _tipo_logo(contenido)
    if tipo is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="El logo tiene que ser PNG o JPG",
        )

    with SessionLocal() as session:
        usuario, perfil, _ = _cargar(session, corralon_id)
        if usuario is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Corralón no encontrado")

        if perfil is None:
            perfil = CorralonPerfilDB(usuario_id=corralon_id, nombre_comercial=usuario.nombre)
            session.add(perfil)

        perfil.logo = contenido
        perfil.logo_tipo = tipo

        resultado = _perfil_dict(usuario, perfil, True)
        session.commit()
        return resultado


@router.get(
    "/{corralon_id}/logo",
    summary="Ver el logo del corralón",
    description="Devuelve la imagen del logo (pública, no tiene datos sensibles).",
    responses={404: {"description": "El corralón no tiene logo"}},
)
def ver_logo(corralon_id: int):
    resultado = obtener_logo(corralon_id)
    if resultado is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sin logo")

    contenido, tipo = resultado
    return Response(
        content=contenido,
        media_type=tipo,
        headers={"Cache-Control": "public, max-age=60", "X-Content-Type-Options": "nosniff"},
    )


@router.get(
    "/{corralon_id}/estadisticas",
    response_model=EstadisticasCorralon,
    summary="Estadísticas de ventas del corralón",
    description=(
        "Ventas de su parte en pedidos pagados (sin cancelados ni devueltos) de los últimos N meses: "
        "total, ticket promedio, ventas por método de pago (efectivo, transferencia, tarjeta de crédito y otros) "
        "y ventas por mes. Lo ve el propio corralón o un administrador."
    ),
    responses={403: {"description": "No es el corralón ni un administrador"}},
)
def estadisticas(
    corralon_id: int,
    usuario_id: int = Query(ge=1, description="Quien consulta (sin login todavía)"),
    meses: int = Query(default=6, ge=1, le=24, description="Cuántos meses mostrar, contando el actual"),
):
    if not _puede_ver(corralon_id, usuario_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No podés ver estas estadísticas")
    return _estadisticas(corralon_id, meses)

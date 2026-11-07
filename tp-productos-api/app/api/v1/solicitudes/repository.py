from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import defer

from poc_postgresql.database import SessionLocal
from poc_postgresql.models import CorralonPerfilDB, SolicitudCorralonDB, UsuarioDB


class UsuarioNoEsCorralon(Exception):
    """El usuario no existe, está inactivo o no tiene rol proveedor."""


class CuentaYaAprobada(Exception):
    """El corralón ya está habilitado: no hace falta otra solicitud."""


class SolicitudYaPendiente(Exception):
    """Ya hay una solicitud en revisión para este usuario."""


class SolicitudNoPendiente(Exception):
    """La solicitud ya fue aprobada o rechazada."""


def _to_dict(solicitud: SolicitudCorralonDB, usuario: UsuarioDB | None = None) -> dict:
    # Nunca se incluye el archivo: se pide aparte y solo lo ve el administrador
    datos = {
        "id": solicitud.id,
        "usuario_id": solicitud.usuario_id,
        "nombre_comercial": solicitud.nombre_comercial,
        "cuit": solicitud.cuit,
        "telefono": solicitud.telefono,
        "direccion": solicitud.direccion,
        "tipo_comprobante": solicitud.tipo_comprobante,
        "archivo_nombre": solicitud.archivo_nombre,
        "estado": solicitud.estado,
        "motivo_rechazo": solicitud.motivo_rechazo,
        "creado_en": solicitud.creado_en,
        "resuelto_en": solicitud.resuelto_en,
    }
    if usuario is not None:
        datos["usuario_nombre"] = usuario.nombre
        datos["usuario_email"] = usuario.email
    return datos


def crear(usuario_id: int, datos: dict, archivo: bytes, archivo_nombre: str, archivo_tipo: str) -> dict:
    with SessionLocal() as session:
        usuario = session.get(UsuarioDB, usuario_id)

        if usuario is None or not usuario.activo or usuario.rol != "proveedor":
            raise UsuarioNoEsCorralon

        if usuario.estado == "aprobado":
            raise CuentaYaAprobada

        pendiente = session.scalar(
            select(SolicitudCorralonDB.id).where(
                SolicitudCorralonDB.usuario_id == usuario_id,
                SolicitudCorralonDB.estado == "pendiente",
            )
        )
        if pendiente is not None:
            raise SolicitudYaPendiente

        solicitud = SolicitudCorralonDB(
            usuario_id=usuario_id,
            nombre_comercial=datos["nombre_comercial"],
            cuit=datos["cuit"],
            telefono=datos["telefono"],
            direccion=datos["direccion"],
            tipo_comprobante=datos["tipo_comprobante"],
            archivo_nombre=archivo_nombre,
            archivo_tipo=archivo_tipo,
            archivo=archivo,
        )
        session.add(solicitud)

        try:
            session.flush()
        except IntegrityError:
            # Dos envíos casi simultáneos: el índice único deja pasar solo uno
            raise SolicitudYaPendiente

        resultado = _to_dict(solicitud)
        session.commit()
        return resultado


def mia(usuario_id: int) -> dict | None:
    """Estado de la cuenta y última solicitud del corralón."""
    with SessionLocal() as session:
        usuario = session.get(UsuarioDB, usuario_id)

        if usuario is None or not usuario.activo:
            return None

        if usuario.rol != "proveedor":
            raise UsuarioNoEsCorralon

        ultima = session.scalar(
            select(SolicitudCorralonDB)
            .options(defer(SolicitudCorralonDB.archivo))
            .where(SolicitudCorralonDB.usuario_id == usuario_id)
            .order_by(SolicitudCorralonDB.creado_en.desc(), SolicitudCorralonDB.id.desc())
            .limit(1)
        )
        return {
            "estado_cuenta": usuario.estado,
            "solicitud": _to_dict(ultima) if ultima is not None else None,
        }


def listar(estado: str | None = None) -> list[dict]:
    with SessionLocal() as session:
        consulta = (
            select(SolicitudCorralonDB, UsuarioDB)
            .options(defer(SolicitudCorralonDB.archivo))
            .join(UsuarioDB, UsuarioDB.id == SolicitudCorralonDB.usuario_id)
            .order_by(SolicitudCorralonDB.creado_en.desc(), SolicitudCorralonDB.id.desc())
        )
        if estado is not None:
            consulta = consulta.where(SolicitudCorralonDB.estado == estado)

        return [_to_dict(s, u) for s, u in session.execute(consulta).all()]


def obtener_archivo(solicitud_id: int) -> tuple[bytes, str] | None:
    with SessionLocal() as session:
        solicitud = session.get(SolicitudCorralonDB, solicitud_id)
        if solicitud is None:
            return None
        return bytes(solicitud.archivo), solicitud.archivo_tipo


def aprobar(solicitud_id: int, admin_id: int) -> dict | None:
    with SessionLocal() as session:
        solicitud = session.get(SolicitudCorralonDB, solicitud_id)
        if solicitud is None:
            return None

        if solicitud.estado != "pendiente":
            raise SolicitudNoPendiente

        usuario = session.get(UsuarioDB, solicitud.usuario_id)
        usuario.estado = "aprobado"

        solicitud.estado = "aprobada"
        solicitud.motivo_rechazo = None
        solicitud.resuelto_en = datetime.now(timezone.utc)
        solicitud.resuelto_por = admin_id

        # Los datos de la solicitud pasan a ser el perfil comercial del corralón
        perfil = session.get(CorralonPerfilDB, usuario.id)
        if perfil is None:
            perfil = CorralonPerfilDB(usuario_id=usuario.id, nombre_comercial=solicitud.nombre_comercial)
            session.add(perfil)
        perfil.nombre_comercial = solicitud.nombre_comercial
        perfil.cuit = solicitud.cuit
        perfil.telefono = solicitud.telefono
        perfil.direccion = solicitud.direccion

        resultado = _to_dict(solicitud)
        session.commit()
        return resultado


def rechazar(solicitud_id: int, admin_id: int, motivo: str) -> dict | None:
    with SessionLocal() as session:
        solicitud = session.get(SolicitudCorralonDB, solicitud_id)
        if solicitud is None:
            return None

        if solicitud.estado != "pendiente":
            raise SolicitudNoPendiente

        # La cuenta queda como está (pendiente): puede corregir y volver a enviar
        solicitud.estado = "rechazada"
        solicitud.motivo_rechazo = motivo.strip()
        solicitud.resuelto_en = datetime.now(timezone.utc)
        solicitud.resuelto_por = admin_id

        resultado = _to_dict(solicitud)
        session.commit()
        return resultado

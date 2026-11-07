from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

TipoComprobante = Literal["monotributo", "otro_arca"]
EstadoSolicitud = Literal["pendiente", "aprobada", "rechazada"]
EstadoCuenta = Literal["pendiente", "aprobado", "rechazado"]


class SolicitudResponse(BaseModel):
    id: int
    usuario_id: int
    nombre_comercial: str
    cuit: str
    telefono: str
    direccion: str
    tipo_comprobante: TipoComprobante
    archivo_nombre: str
    estado: EstadoSolicitud
    motivo_rechazo: str | None = None
    creado_en: datetime
    resuelto_en: datetime | None = None


class SolicitudAdminResponse(SolicitudResponse):
    usuario_nombre: str
    usuario_email: str


class MiSolicitudResponse(BaseModel):
    estado_cuenta: EstadoCuenta
    solicitud: SolicitudResponse | None = None


class RechazoRequest(BaseModel):
    motivo: str = Field(min_length=3, max_length=300)

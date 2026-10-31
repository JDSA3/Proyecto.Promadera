"""Correos que se mandan por los pedidos."""
from datetime import datetime, timedelta, timezone
from html import escape

from app.core.correo import enviar_correo, logger
from poc_postgresql.database import SessionLocal
from poc_postgresql.models import UsuarioDB


HORA_ARGENTINA = timezone(timedelta(hours=-3))


def _fecha(fecha: datetime) -> str:
    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=timezone.utc)
    return fecha.astimezone(HORA_ARGENTINA).strftime("%d/%m/%Y %H:%M")


def _pesos(monto: float) -> str:
    return "$" + f"{monto:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _email_de(usuario_id: int) -> str | None:
    try:
        with SessionLocal() as session:
            usuario = session.get(UsuarioDB, usuario_id)
            return usuario.email if usuario else None
    except Exception:
        logger.exception("No se pudo buscar el correo del usuario %s", usuario_id)
        return None


def _detalle_item(item: dict) -> str:
    corte = f" (corte de {item['largo_cm']:g} cm)" if item.get("largo_cm") else ""
    return f"{item['cantidad']} x {item['nombre']}{corte}: {_pesos(item['subtotal'])}"


def enviar_pedido_recibido(pedido: dict) -> bool:
    """Correo "Pedido recibido" al carpintero cuando crea el pedido."""
    destinatario = _email_de(pedido["cliente"]["id"])
    if not destinatario:
        return False

    numero = pedido["id"]
    fecha = _fecha(pedido["creado_en"])
    nombre = pedido["cliente"]["nombre"]

    lineas_texto = []
    bloques_html = []
    for corralon in pedido["corralones"]:
        titulo = corralon["proveedor_nombre"] or "Sin corralón"
        items = [_detalle_item(item) for item in corralon["items"]]
        lineas_texto.append(f"\n{titulo} (subtotal {_pesos(corralon['total'])})")
        lineas_texto.extend(f"  - {item}" for item in items)
        bloques_html.append(
            f"<h3>{escape(titulo)}</h3><ul>"
            + "".join(f"<li>{escape(item)}</li>" for item in items)
            + f"</ul><p>Subtotal: {_pesos(corralon['total'])}</p>"
        )

    total = _pesos(pedido["total"])
    asunto = f"ProMadera: recibimos tu pedido #{numero}"
    texto = (
        f"Hola {nombre}:\n\n"
        f"Recibimos tu pedido #{numero} del {fecha}. Está pendiente de pago.\n"
        + "\n".join(lineas_texto)
        + f"\n\nTotal: {total}\n\n"
        "Cuando se confirme el pago te mandamos el comprobante.\n\nProMadera"
    )
    html = (
        f"<p>Hola {escape(nombre)}:</p>"
        f"<p>Recibimos tu pedido <b>#{numero}</b> del {fecha}. Está <b>pendiente de pago</b>.</p>"
        + "".join(bloques_html)
        + f"<p><b>Total: {total}</b></p>"
        "<p>Cuando se confirme el pago te mandamos el comprobante.</p><p>ProMadera</p>"
    )
    return enviar_correo(destinatario, asunto, texto, html)

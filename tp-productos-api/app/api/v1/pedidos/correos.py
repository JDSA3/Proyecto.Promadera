"""Correos que se mandan por los pedidos."""
from html import escape

from app.core.correo import enviar_correo, logger
from poc_postgresql.database import SessionLocal
from poc_postgresql.models import UsuarioDB

from . import comprobante
from .comprobante import fecha_argentina as _fecha, pesos as _pesos


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


def _comprobante_al_cliente(pedido: dict) -> bool:
    destinatario = _email_de(pedido["cliente"]["id"])
    if not destinatario:
        return False

    try:
        pdf = comprobante.generar_pdf(pedido, destinatario)
    except Exception:
        logger.exception("No se pudo generar el comprobante del pedido %s", pedido["id"])
        return False

    numero = pedido["id"]
    nombre = pedido["cliente"]["nombre"]
    total = _pesos(pedido["total"])
    corralones = ", ".join(c["proveedor_nombre"] or "Sin corralón" for c in pedido["corralones"])
    asunto = f"ProMadera: pago confirmado del pedido #{numero}"
    texto = (
        f"Hola {nombre}:\n\n"
        f"Confirmamos el pago de tu pedido #{numero} por {total}.\n"
        f"Te adjuntamos el comprobante de compra N.º {comprobante.numero(numero)}.\n\n"
        f"Ya les avisamos a los corralones para que lo preparen: {corralones}.\n\nProMadera"
    )
    html = (
        f"<p>Hola {escape(nombre)}:</p>"
        f"<p>Confirmamos el pago de tu pedido <b>#{numero}</b> por <b>{total}</b>.</p>"
        f"<p>Te adjuntamos el comprobante de compra N.º {comprobante.numero(numero)}.</p>"
        f"<p>Ya les avisamos a los corralones para que lo preparen: {escape(corralones)}.</p><p>ProMadera</p>"
    )
    return enviar_correo(
        destinatario, asunto, texto, html, adjuntos=[(comprobante.nombre_archivo(numero), pdf)]
    )


def _aviso_al_corralon(pedido: dict, corralon: dict) -> bool:
    if corralon["proveedor_id"] is None:
        return False

    destinatario = _email_de(corralon["proveedor_id"])
    if not destinatario:
        return False

    numero = pedido["id"]
    titulo = corralon["proveedor_nombre"] or "corralón"
    cliente = pedido["cliente"]["nombre"]
    items = [_detalle_item(item) for item in corralon["items"]]
    subtotal = _pesos(corralon["total"])
    asunto = f"ProMadera: pedido #{numero} pagado para preparar"
    texto = (
        f"Hola {titulo}:\n\n"
        f"{cliente} pagó el pedido #{numero}. Estos son tus productos para preparar:\n"
        + "\n".join(f"  - {item}" for item in items)
        + f"\n\nSubtotal: {subtotal}\n\n"
        "Entrá a Pedidos en ProMadera para confirmarlo.\n\nProMadera"
    )
    html = (
        f"<p>Hola {escape(titulo)}:</p>"
        f"<p>{escape(cliente)} pagó el pedido <b>#{numero}</b>. Estos son tus productos para preparar:</p><ul>"
        + "".join(f"<li>{escape(item)}</li>" for item in items)
        + f"</ul><p><b>Subtotal: {subtotal}</b></p>"
        "<p>Entrá a Pedidos en ProMadera para confirmarlo.</p><p>ProMadera</p>"
    )
    return enviar_correo(destinatario, asunto, texto, html)


def enviar_pago_confirmado(pedido: dict) -> None:
    """Cuando el pedido pasa a pagado: comprobante al carpintero y aviso a cada corralón del pedido."""
    _comprobante_al_cliente(pedido)
    for corralon in pedido["corralones"]:
        _aviso_al_corralon(pedido, corralon)

"""Envío de correos con Gmail (SMTP + contraseña de aplicación).

Nunca levanta errores: si faltan las credenciales o Gmail falla, lo deja
en el log y devuelve False, así el pedido o el pago no se rompen.
"""
import logging
import mimetypes
import os
import smtplib
from email.message import EmailMessage

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587

logger = logging.getLogger("uvicorn.error")


def enviar_correo(
    destinatario: str,
    asunto: str,
    texto: str,
    html: str | None = None,
    adjuntos: list[tuple[str, bytes]] | None = None,
) -> bool:
    """adjuntos: lista de (nombre del archivo, contenido), por ejemplo [("comprobante.pdf", pdf)]."""
    usuario = os.getenv("GMAIL_USER")
    password = os.getenv("GMAIL_APP_PASSWORD")

    if not usuario or not password:
        logger.warning("Correo no enviado a %s: faltan GMAIL_USER o GMAIL_APP_PASSWORD en el .env", destinatario)
        return False

    mensaje = EmailMessage()
    mensaje["From"] = f"ProMadera <{usuario}>"
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto
    mensaje.set_content(texto)
    if html:
        mensaje.add_alternative(html, subtype="html")
    for nombre, contenido in adjuntos or []:
        tipo = mimetypes.guess_type(nombre)[0] or "application/octet-stream"
        principal, secundario = tipo.split("/")
        mensaje.add_attachment(contenido, maintype=principal, subtype=secundario, filename=nombre)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as servidor:
            servidor.starttls()
            servidor.login(usuario, password.replace(" ", ""))
            servidor.send_message(mensaje)
    except Exception:
        logger.exception("No se pudo enviar el correo a %s", destinatario)
        return False

    logger.info("Correo enviado a %s: %s", destinatario, asunto)
    return True

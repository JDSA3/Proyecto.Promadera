"""Envío de correos.

Dos formas de salida, según las variables de entorno:
- BREVO_API_KEY: se manda por la API web de Brevo (HTTPS). Sirve en hostings como Render que
  bloquean el SMTP. El remitente es MAIL_REMITENTE (o GMAIL_USER) y tiene que estar verificado en Brevo.
- GMAIL_USER y GMAIL_APP_PASSWORD: se manda con Gmail por SMTP (contraseña de aplicación).

Nunca levanta errores: si faltan las credenciales o el servicio falla, lo deja
en el log y devuelve False, así el pedido o el pago no se rompen.
"""
import base64
import logging
import mimetypes
import os
import smtplib
from email.message import EmailMessage

import httpx

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
BREVO_URL = "https://api.brevo.com/v3/smtp/email"

logger = logging.getLogger("uvicorn.error")


def _enviar_por_brevo(
    api_key: str,
    remitente: str,
    destinatario: str,
    asunto: str,
    texto: str,
    html: str | None,
    adjuntos: list[tuple[str, bytes]] | None,
) -> None:
    cuerpo: dict = {
        "sender": {"name": "ProMadera", "email": remitente},
        "to": [{"email": destinatario}],
        "subject": asunto,
        "textContent": texto,
    }
    if html:
        cuerpo["htmlContent"] = html
    if adjuntos:
        cuerpo["attachment"] = [
            {"name": nombre, "content": base64.b64encode(contenido).decode("ascii")}
            for nombre, contenido in adjuntos
        ]

    respuesta = httpx.post(
        BREVO_URL,
        json=cuerpo,
        headers={"api-key": api_key, "accept": "application/json"},
        timeout=20,
    )
    respuesta.raise_for_status()


def _enviar_por_gmail(
    usuario: str,
    password: str,
    destinatario: str,
    asunto: str,
    texto: str,
    html: str | None,
    adjuntos: list[tuple[str, bytes]] | None,
) -> None:
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

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as servidor:
        servidor.starttls()
        servidor.login(usuario, password.replace(" ", ""))
        servidor.send_message(mensaje)


def enviar_correo(
    destinatario: str,
    asunto: str,
    texto: str,
    html: str | None = None,
    adjuntos: list[tuple[str, bytes]] | None = None,
) -> bool:
    """adjuntos: lista de (nombre del archivo, contenido), por ejemplo [("comprobante.pdf", pdf)]."""
    gmail_usuario = os.getenv("GMAIL_USER")
    gmail_password = os.getenv("GMAIL_APP_PASSWORD")
    brevo_key = os.getenv("BREVO_API_KEY")

    try:
        if brevo_key:
            remitente = os.getenv("MAIL_REMITENTE") or gmail_usuario
            if not remitente:
                logger.warning("Correo no enviado a %s: falta MAIL_REMITENTE (o GMAIL_USER) para Brevo", destinatario)
                return False
            _enviar_por_brevo(brevo_key, remitente, destinatario, asunto, texto, html, adjuntos)
        elif gmail_usuario and gmail_password:
            _enviar_por_gmail(gmail_usuario, gmail_password, destinatario, asunto, texto, html, adjuntos)
        else:
            logger.warning(
                "Correo no enviado a %s: faltan BREVO_API_KEY o GMAIL_USER y GMAIL_APP_PASSWORD en el .env",
                destinatario,
            )
            return False
    except Exception:
        logger.exception("No se pudo enviar el correo a %s", destinatario)
        return False

    logger.info("Correo enviado a %s: %s", destinatario, asunto)
    return True

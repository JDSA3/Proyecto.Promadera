import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[4] / ".env")

URL_PREFERENCIAS = "https://api.mercadopago.com/checkout/preferences"
URL_PAGOS = "https://api.mercadopago.com/v1/payments"


class SinToken(Exception):
    pass


class ErrorMercadoPago(Exception):
    pass


def _token() -> str:
    token = os.getenv("MP_ACCESS_TOKEN")

    if not token:
        raise SinToken("Falta MP_ACCESS_TOKEN en el .env")

    return token


def crear_preferencia(pedido: dict) -> dict:
    token = _token()

    datos = {
        "items": [
            {
                "id": str(item["producto_id"]),
                "title": f"{item['nombre']} (corte {item['largo_cm']:g} cm)" if item.get("largo_cm") else item["nombre"],
                "quantity": item["cantidad"],
                "unit_price": item["precio_unitario"],
                "currency_id": "ARS",
            }
            for item in pedido["items"]
        ],
        "external_reference": str(pedido["id"]),
    }

    url_retorno = os.getenv("MP_BACK_URL")

    if url_retorno:
        datos["back_urls"] = {
            "success": url_retorno,
            "failure": url_retorno,
            "pending": url_retorno,
        }
        datos["auto_return"] = "approved"

    url_webhook = os.getenv("MP_WEBHOOK_URL")

    if url_webhook:
        datos["notification_url"] = url_webhook

    pedido_http = urllib.request.Request(
        URL_PREFERENCIAS,
        data=json.dumps(datos).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    return _enviar(pedido_http)


def obtener_pago(pago_id: str) -> dict:
    pedido_http = urllib.request.Request(
        f"{URL_PAGOS}/{pago_id}",
        headers={"Authorization": f"Bearer {_token()}"},
    )

    return _enviar(pedido_http)


def _enviar(pedido_http: urllib.request.Request) -> dict:
    try:
        with urllib.request.urlopen(pedido_http, timeout=15) as respuesta:
            return json.load(respuesta)
    except urllib.error.HTTPError as error:
        detalle = error.read().decode(errors="replace")
        raise ErrorMercadoPago(
            f"Mercado Pago respondió {error.code}: {detalle}"
        ) from error
    except urllib.error.URLError as error:
        raise ErrorMercadoPago(
            f"No se pudo conectar con Mercado Pago: {error.reason}"
        ) from error

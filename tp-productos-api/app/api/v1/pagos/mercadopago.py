import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[4] / ".env")

URL_PREFERENCIAS = "https://api.mercadopago.com/checkout/preferences"


class SinToken(Exception):
    pass


class ErrorMercadoPago(Exception):
    pass


def crear_preferencia(pedido: dict) -> dict:
    token = os.getenv("MP_ACCESS_TOKEN")

    if not token:
        raise SinToken("Falta MP_ACCESS_TOKEN en el .env")

    datos = {
        "items": [
            {
                "id": str(item["producto_id"]),
                "title": item["nombre"],
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

    pedido_http = urllib.request.Request(
        URL_PREFERENCIAS,
        data=json.dumps(datos).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

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

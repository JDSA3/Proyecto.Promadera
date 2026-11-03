"""Comprobante de compra en PDF. Es un comprobante propio de ProMadera, no una factura fiscal de ARCA/AFIP."""
from datetime import datetime, timedelta, timezone
from html import escape
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

HORA_ARGENTINA = timezone(timedelta(hours=-3))
PUNTO_DE_VENTA = "0001"


def fecha_argentina(fecha: datetime) -> str:
    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=timezone.utc)
    return fecha.astimezone(HORA_ARGENTINA).strftime("%d/%m/%Y %H:%M")


def pesos(monto: float) -> str:
    return "$" + f"{monto:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def numero(pedido_id: int) -> str:
    return f"{PUNTO_DE_VENTA}-{pedido_id:08d}"


def nombre_archivo(pedido_id: int) -> str:
    return f"comprobante-{numero(pedido_id)}.pdf"


def _producto(item: dict) -> str:
    corte = f" (corte de {item['largo_cm']:g} cm)" if item.get("largo_cm") else ""
    return escape(item["nombre"] + corte)


def generar_pdf(pedido: dict, cliente_email: str | None) -> bytes:
    estilos = getSampleStyleSheet()
    normal = estilos["Normal"]
    archivo = BytesIO()
    documento = SimpleDocTemplate(
        archivo, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
        title=f"Comprobante {numero(pedido['id'])}", author="ProMadera",
    )

    cliente = escape(pedido["cliente"]["nombre"])
    if cliente_email:
        cliente += f" ({escape(cliente_email)})"

    contenido = [
        Paragraph("ProMadera", estilos["Title"]),
        Paragraph("Comprobante de compra", estilos["Heading2"]),
        Paragraph(f"<b>N.º:</b> {numero(pedido['id'])}", normal),
        Paragraph(f"<b>Pedido:</b> #{pedido['id']}", normal),
        Paragraph(f"<b>Fecha del pedido:</b> {fecha_argentina(pedido['creado_en'])}", normal),
        Paragraph(f"<b>Emitido:</b> {fecha_argentina(datetime.now(timezone.utc))}", normal),
        Paragraph(f"<b>Cliente:</b> {cliente}", normal),
        Paragraph(f"<b>Estado:</b> {escape(pedido['estado'])}", normal),
        Spacer(1, 0.6 * cm),
    ]

    for corralon in pedido["corralones"]:
        filas = [["Producto", "Cant.", "Precio unit.", "Subtotal"]]
        filas += [
            [Paragraph(_producto(item), normal), item["cantidad"], pesos(item["precio_unitario"]), pesos(item["subtotal"])]
            for item in corralon["items"]
        ]
        filas.append(["", "", "Subtotal", pesos(corralon["total"])])

        tabla = Table(filas, colWidths=[8.5 * cm, 1.7 * cm, 3.2 * cm, 3.6 * cm])
        tabla.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#8B5A2B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.lightgrey),
            ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
        ]))
        contenido += [
            Paragraph(escape(corralon["proveedor_nombre"] or "Sin corralón"), estilos["Heading3"]),
            tabla,
            Spacer(1, 0.4 * cm),
        ]

    contenido += [
        Paragraph(f"<b>Total: {pesos(pedido['total'])}</b>", estilos["Heading2"]),
        Spacer(1, 0.6 * cm),
        Paragraph(
            "Comprobante de compra interno de ProMadera. No es una factura fiscal (no válido ante ARCA/AFIP).",
            estilos["Italic"],
        ),
    ]

    documento.build(contenido)
    return archivo.getvalue()

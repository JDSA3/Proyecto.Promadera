"""Comprobante de compra en PDF. Es un comprobante propio de ProMadera, no una factura fiscal de ARCA/AFIP."""
import logging
from datetime import datetime, timedelta, timezone
from html import escape
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

logger = logging.getLogger(__name__)

HORA_ARGENTINA = timezone(timedelta(hours=-3))
PUNTO_DE_VENTA = "0001"

# Este archivo está en app/api/v1/pedidos/: el logo está en app/assets/logo.png
LOGO_PROMADERA = Path(__file__).resolve().parents[3] / "assets" / "logo.png"


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


def _imagen(origen, ancho_max: float, alto_max: float) -> Image:
    """Imagen escalada para entrar en el recuadro sin deformarla. origen: ruta de archivo o bytes."""

    def abrir():
        return BytesIO(origen) if isinstance(origen, bytes) else str(origen)

    ancho, alto = ImageReader(abrir()).getSize()
    escala = min(ancho_max / ancho, alto_max / alto)
    imagen = Image(abrir(), width=ancho * escala, height=alto * escala)
    imagen.hAlign = "LEFT"
    return imagen


def _logo_promadera() -> Image | None:
    try:
        if LOGO_PROMADERA.is_file():
            return _imagen(LOGO_PROMADERA, 2.4 * cm, 2.4 * cm)
    except Exception:
        # Un problema con el logo nunca tiene que impedir el comprobante
        logger.exception("No se pudo cargar el logo de ProMadera para el comprobante")
    return None


def _logo_corralon(proveedor_id: int | None) -> Image | None:
    if proveedor_id is None:
        return None
    try:
        from app.api.v1.corralones.panel import obtener_logo

        logo = obtener_logo(proveedor_id)
        if logo is None:
            return None
        datos, _tipo = logo
        return _imagen(datos, 3 * cm, 1.6 * cm)
    except Exception:
        logger.exception("No se pudo cargar el logo del corralón %s para el comprobante", proveedor_id)
        return None


def _fila_con_logo(logo: Image, contenido, ancho_logo: float) -> Table:
    tabla = Table([[logo, contenido]], colWidths=[ancho_logo, 17 * cm - ancho_logo])
    tabla.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return tabla


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

    # Encabezado: logo de ProMadera a la izquierda y los títulos al lado
    estilo_titulo = ParagraphStyle("TituloProMadera", parent=estilos["Title"], alignment=TA_LEFT)
    estilo_subtitulo = ParagraphStyle("SubtituloProMadera", parent=estilos["Heading2"], alignment=TA_LEFT)
    titulos = [
        Paragraph("ProMadera", estilo_titulo),
        Paragraph("Comprobante de compra", estilo_subtitulo),
    ]
    logo = _logo_promadera()
    contenido = [_fila_con_logo(logo, titulos, 3 * cm)] if logo is not None else list(titulos)

    contenido += [
        Paragraph(f"<b>N.º:</b> {numero(pedido['id'])}", normal),
        Paragraph(f"<b>Pedido:</b> #{pedido['id']}", normal),
        Paragraph(f"<b>Fecha del pedido:</b> {fecha_argentina(pedido['creado_en'])}", normal),
        Paragraph(f"<b>Emitido:</b> {fecha_argentina(datetime.now(timezone.utc))}", normal),
        Paragraph(f"<b>Cliente:</b> {cliente}", normal),
        Paragraph(f"<b>Estado:</b> {escape(pedido['estado'])}", normal),
        Paragraph(f"<b>Entrega:</b> {'Envío' if pedido.get('entrega') == 'envio' else 'Retiro en el corralón'}", normal),
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

        # Nombre del corralón, con su logo al lado si lo subió
        nombre = Paragraph(escape(corralon["proveedor_nombre"] or "Sin corralón"), estilos["Heading3"])
        logo_corralon = _logo_corralon(corralon.get("proveedor_id"))
        if logo_corralon is not None:
            contenido += [_fila_con_logo(logo_corralon, nombre, 3.4 * cm), Spacer(1, 0.2 * cm)]
        else:
            contenido.append(nombre)

        contenido += [tabla, Spacer(1, 0.4 * cm)]

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

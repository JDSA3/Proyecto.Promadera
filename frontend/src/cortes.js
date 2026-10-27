// Corte a medida: cuentas del slider de Insumos.
// El precio de la base es de la pieza entera; el corte se cobra proporcional a su largo.
// El backend repite estas cuentas (el precio y el stock que valen son los suyos).

// factor = centímetros que tiene una unidad
export const UNIDADES = [
  { id: "m", etiqueta: "m", factor: 100 },
  { id: "cm", etiqueta: "cm", factor: 1 },
  { id: "mm", etiqueta: "mm", factor: 0.1 },
];

// Se puede cortar si es una pieza larga y angosta (tirantes, tablas, listones, tapacanto en rollo).
export function esCortable(producto) {
  return Number(producto.largo_cm) >= 200 && producto.ancho_cm != null && Number(producto.ancho_cm) <= 25;
}

export function precioCorte(producto, largoCm) {
  return Math.round(((producto.precio * largoCm) / producto.largo_cm + Number.EPSILON) * 100) / 100;
}

// Cuántos cortes salen de una pieza (los cortes no pueden pasar de una pieza a otra).
export function cortesPorPieza(producto, largoCm) {
  return Math.max(0, Math.floor(producto.largo_cm / largoCm + 1e-9));
}

export function piezasNecesarias(producto, largoCm, cantidad) {
  const porPieza = cortesPorPieza(producto, largoCm);
  return porPieza > 0 ? Math.ceil(cantidad / porPieza) : 0;
}

const numero = (n) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 });

export function formatearLargo(cm) {
  const n = Number(cm);
  return n >= 100 ? `${numero(n / 100)} m` : `${numero(n)} cm`;
}

// Nombre para mostrar en carrito y pedidos: agrega el largo del corte si lo tiene.
export function nombreItem(item) {
  return item.largo_cm ? `${item.nombre} · corte de ${formatearLargo(item.largo_cm)}` : item.nombre;
}

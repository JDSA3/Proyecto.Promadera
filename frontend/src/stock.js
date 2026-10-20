// Reglas de stock compartidas por las pantallas del Corralón.
// TODO: cuando el backend guarde un stock mínimo por producto, usarlo acá.
export const STOCK_BAJO = 10;

// Devuelve el estado de un producto según su stock.
export function estadoDe(stock) {
  if (stock <= 0) return { id: "agotado", texto: "Sin stock", clase: "estado-agotado" };
  if (stock <= STOCK_BAJO) return { id: "bajo", texto: "Stock bajo", clase: "estado-bajo" };
  return { id: "ok", texto: "Disponible", clase: "estado-ok" };
}

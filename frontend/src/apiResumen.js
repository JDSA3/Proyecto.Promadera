import { API_BASE } from "./api.js";

// Resumen del panel de inicio del corralón (ventas del mes, pendientes, más vendidos, stock bajo).
export async function obtenerResumenCorralon(corralonId, { stockMinimo = 10, masVendidos = 5 } = {}) {
  const params = new URLSearchParams({
    stock_minimo: stockMinimo,
    mas_vendidos: masVendidos,
  });
  const res = await fetch(`${API_BASE}/corralones/${corralonId}/resumen?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ? JSON.stringify(err.detail) : `Error ${res.status}`);
  }
  return res.json();
}

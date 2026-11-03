import { API_BASE } from "./api.js";

// URL para abrir el comprobante de un pedido pagado.
// Si la ruta o el parámetro cambian en el backend, se ajusta solo acá.
export function urlComprobante(pedidoId, usuarioId) {
  return `${API_BASE}/pedidos/${pedidoId}/comprobante?usuario_id=${usuarioId}`;
}

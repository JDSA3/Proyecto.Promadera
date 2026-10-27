import { API_BASE } from "./api.js";

async function manejarRespuesta(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ? JSON.stringify(err.detail) : `Error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

const JSON_HEADERS = { "Content-Type": "application/json" };

function urlConCorralon(ruta, corralonId) {
  const params = new URLSearchParams();
  if (corralonId) params.set("corralon_id", corralonId);
  return `${API_BASE}${ruta}` + (params.toString() ? `?${params}` : "");
}

export async function obtenerProveedoresInsumo({ corralonId } = {}) {
  const res = await fetch(urlConCorralon("/proveedores-insumo", corralonId));
  return manejarRespuesta(res);
}

export async function crearProveedorInsumo({ corralonId, nombre, telefono, email }) {
  const res = await fetch(`${API_BASE}/proveedores-insumo`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      corralon_id: corralonId,
      nombre,
      telefono: telefono || null,
      email: email || null,
    }),
  });
  return manejarRespuesta(res);
}

export async function editarProveedorInsumo({ proveedorId, usuarioId, nombre, telefono, email }) {
  const res = await fetch(`${API_BASE}/proveedores-insumo/${proveedorId}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      usuario_id: usuarioId,
      nombre,
      telefono: telefono || null,
      email: email || null,
    }),
  });
  return manejarRespuesta(res);
}

export async function borrarProveedorInsumo({ proveedorId, usuarioId }) {
  const res = await fetch(`${API_BASE}/proveedores-insumo/${proveedorId}?usuario_id=${usuarioId}`, {
    method: "DELETE",
  });
  return manejarRespuesta(res);
}

export async function obtenerOrdenesCompra({ corralonId } = {}) {
  const res = await fetch(urlConCorralon("/ordenes-compra", corralonId));
  return manejarRespuesta(res);
}

export async function crearOrdenCompra({ corralonId, proveedorInsumoId, items }) {
  const res = await fetch(`${API_BASE}/ordenes-compra`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      corralon_id: corralonId,
      proveedor_insumo_id: proveedorInsumoId,
      items,
    }),
  });
  return manejarRespuesta(res);
}

export async function recibirOrdenCompra({ ordenId, usuarioId }) {
  const res = await fetch(`${API_BASE}/ordenes-compra/${ordenId}/recibir`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ usuario_id: usuarioId }),
  });
  return manejarRespuesta(res);
}

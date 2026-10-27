export const API_BASE = "http://127.0.0.1:8000/api/v1";

export async function obtenerCategorias() {
  const res = await fetch(`${API_BASE}/categorias`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function obtenerProductos({ query, categoriaId, proveedorId } = {}) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (categoriaId) params.set("categoria_id", categoriaId);
  if (proveedorId) params.set("proveedor_id", proveedorId);

  const url = `${API_BASE}/productos` + (params.toString() ? `?${params}` : "");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}
async function manejarRespuesta(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.detail ? JSON.stringify(err.detail) : `Error ${res.status}`
    );
  }
  return res.status === 204 ? null : res.json();
}

export async function obtenerRecomendados(id, limite = 6) {
  const res = await fetch(`${API_BASE}/productos/${id}/recomendados?limite=${limite}`);
  return manejarRespuesta(res);
}

export async function obtenerPedidos({ clienteId, proveedorId } = {}) {
  const params = new URLSearchParams();
  if (clienteId) params.set("cliente_id", clienteId);
  if (proveedorId) params.set("proveedor_id", proveedorId);

  const url = `${API_BASE}/pedidos` + (params.toString() ? `?${params}` : "");
  const res = await fetch(url);
  return manejarRespuesta(res);
}

export async function crearProducto(data) {
  const res = await fetch(`${API_BASE}/productos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return manejarRespuesta(res);
}

export async function editarProducto(id, data) {
  const res = await fetch(`${API_BASE}/productos/${id}`, {
    method: "PUT", // cambialo a PATCH si tu API usa PATCH
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return manejarRespuesta(res);
}

export async function eliminarProducto(id) {
  const res = await fetch(`${API_BASE}/productos/${id}`, {
    method: "DELETE",
  });
  return manejarRespuesta(res);
}

export async function loginUsuario({ email, password }) {
  const res = await fetch(`${API_BASE}/usuarios/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return manejarRespuesta(res);
}

export async function registrarUsuario({ nombre, email, password, rol }) {
  const res = await fetch(`${API_BASE}/usuarios/registro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email, password, rol }),
  });
  return manejarRespuesta(res);
}
export async function crearPedido({ clienteId, items }) {
  const res = await fetch(`${API_BASE}/pedidos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cliente_id: clienteId,
      items: items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
    }),
  });
  return manejarRespuesta(res);
}

export async function crearPreferenciaPago(pedidoId) {
  const res = await fetch(`${API_BASE}/pagos/preferencia`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pedido_id: pedidoId }),
  });
  return manejarRespuesta(res);
}

export async function simularPago(pedidoId) {
  const res = await fetch(`${API_BASE}/pagos/simular`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pedido_id: pedidoId }),
  });
  return manejarRespuesta(res);
}

export async function obtenerCombos() {
  const res = await fetch(`${API_BASE}/combos`);
  return manejarRespuesta(res);
}

export async function crearCombo({ autorId, titulo, descripcion, imagen, items }) {
  const res = await fetch(`${API_BASE}/combos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ autor_id: autorId, titulo, descripcion, imagen, items }),
  });
  return manejarRespuesta(res);
}

export async function borrarCombo({ id, usuarioId }) {
  const res = await fetch(`${API_BASE}/combos/${id}?usuario_id=${usuarioId}`, { method: "DELETE" });
  return manejarRespuesta(res);
}

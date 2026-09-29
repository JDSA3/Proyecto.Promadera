export const API_BASE = "http://127.0.0.1:8000/api/v1";

export async function obtenerCategorias() {
  const res = await fetch(`${API_BASE}/categorias`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function obtenerProductos({ query, categoriaId }) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (categoriaId) params.set("categoria_id", categoriaId);

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
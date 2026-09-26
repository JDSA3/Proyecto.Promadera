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

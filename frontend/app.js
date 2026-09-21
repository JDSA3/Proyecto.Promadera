const API_BASE = "http://127.0.0.1:8000/api/v1";

const contenedor = document.getElementById("productos");
const inputBuscar = document.getElementById("buscador");
const selectCategoria = document.getElementById("categoria");

function formatearPrecio(precio) {
  return precio.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function mostrarMensaje(texto) {
  contenedor.innerHTML = `<p class="mensaje">${texto}</p>`;
}

function mostrarProductos(productos) {
  const activos = productos.filter((p) => p.activo);
  if (activos.length === 0) {
    mostrarMensaje("No se encontraron productos con esa búsqueda.");
    return;
  }
  contenedor.innerHTML = activos
    .map(
      (p) => `
      <div class="producto">
        <img src="imagenes/${p.id}.webp"
             alt="${p.nombre}"
             onerror="this.onerror=null; this.src='logo.png'">
        <h3>${p.nombre}</h3>
        <p class="categoria">${p.categoria.nombre}</p>
        <p class="precio">${formatearPrecio(p.precio)}</p>
        <p class="stock">Stock: ${p.stock}</p>
      </div>`
    )
    .join("");
}

async function cargarCategorias() {
  try {
    const res = await fetch(`${API_BASE}/categorias`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const categorias = await res.json();
    selectCategoria.innerHTML =
      `<option value="">Todas las categorías</option>` +
      categorias.map((c) => `<option value="${c.id}">${c.nombre}</option>`).join("");
  } catch (err) {
    console.error("No se pudieron cargar las categorías:", err);
  }
}

async function cargarProductos() {
  const params = new URLSearchParams();
  const query = inputBuscar.value.trim();
  if (query) params.set("query", query);
  if (selectCategoria.value) params.set("categoria_id", selectCategoria.value);

  const url = `${API_BASE}/productos` + (params.toString() ? `?${params}` : "");

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    mostrarProductos(await res.json());
  } catch (err) {
    console.error("No se pudieron cargar los productos:", err);
    mostrarMensaje("No se pudo conectar con el servidor. Verifica que la API esté encendida.");
  }
}

// Espera 300 ms después de dejar de escribir antes de buscar
let temporizador;
inputBuscar.addEventListener("input", () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(cargarProductos, 300);
});
selectCategoria.addEventListener("change", cargarProductos);

cargarCategorias();
cargarProductos();
const API_URL = "http://127.0.0.1:8000/api/v1/productos";

// Cambia "productos" por el id del contenedor en tu HTML
const contenedor = document.getElementById("productos");

function formatearPrecio(precio) {
  return precio.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function mostrarProductos(productos) {
  contenedor.innerHTML = productos
    .filter((p) => p.activo)
    .map(
      (p) => `
      <div class="producto">
        <h3>${p.nombre}</h3>
        <p class="categoria">${p.categoria.nombre}</p>
        <p class="precio">${formatearPrecio(p.precio)}</p>
        <p class="stock">Stock: ${p.stock}</p>
      </div>`
    )
    .join("");
}

async function cargarProductos() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const productos = await res.json();
    mostrarProductos(productos);
  } catch (err) {
    console.error("No se pudieron cargar los productos:", err);
    contenedor.innerHTML =
      "<p>No se pudieron cargar los productos. Verifica que el servidor esté encendido.</p>";
  }
}

cargarProductos();
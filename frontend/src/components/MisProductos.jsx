import { useEffect, useState } from "react";
import {
  obtenerCategorias,
  obtenerProductos,
  crearProducto,
  editarProducto,
  eliminarProducto,
} from "../api.js";
import ModalProducto from "./ModalProducto.jsx";

function formatearPrecio(precio) {
  return precio.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export default function MisProductos({ usuario }) {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState(null); // null = todavía no cargó
  const [error, setError] = useState(false);
  const [modal, setModal] = useState(null); // null | "nuevo" | { ...producto }

  function recargar() {
    obtenerProductos({ proveedorId: usuario.id })
      .then((datos) => {
        setProductos(datos);
        setError(false);
      })
      .catch((err) => {
        console.error("No se pudieron cargar tus productos:", err);
        setError(true);
      });
  }

  useEffect(() => {
    obtenerCategorias()
      .then(setCategorias)
      .catch((err) => console.error("No se pudieron cargar las categorías:", err));
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario.id]);

  async function handleCrear(datos) {
    try {
      await crearProducto({ ...datos, proveedor_id: usuario.id });
      setModal(null);
      recargar();
    } catch (err) {
      alert("No se pudo crear el producto: " + err.message);
    }
  }

  async function handleEditar(datos) {
    try {
      await editarProducto(modal.id, datos);
      setModal(null);
      recargar();
    } catch (err) {
      alert("No se pudo guardar el producto: " + err.message);
    }
  }

  async function handleDarDeBaja(producto) {
    if (!window.confirm(`¿Dar de baja "${producto.nombre}"? Dejará de verse en el catálogo.`)) {
      return;
    }
    try {
      await eliminarProducto(producto.id);
      recargar();
    } catch (err) {
      alert("No se pudo dar de baja el producto: " + err.message);
    }
  }

  function contenido() {
    if (error) {
      return (
        <p className="mensaje">
          No se pudo conectar con el servidor. Verifica que la API esté encendida.
        </p>
      );
    }
    if (productos === null) return null;
    if (productos.length === 0) {
      return <p className="mensaje">Todavía no cargaste ningún producto.</p>;
    }
    return (
      <div className="grilla-productos">
        {productos.map((p) => (
          <div className="producto" key={p.id}>
            <img
              src={`/imagenes/${p.id}.webp`}
              alt={p.nombre}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/logo.png";
              }}
            />
            <h3>{p.nombre}</h3>
            <p className="categoria">{p.categoria.nombre}</p>
            <p className="precio">{formatearPrecio(p.precio)}</p>
            <p className="stock">Stock: {p.stock}</p>
            <div className="acciones-mis-productos">
              <button type="button" className="btn-crear" onClick={() => setModal(p)}>
                Editar
              </button>
              <button
                type="button"
                className="btn-cancelar"
                onClick={() => handleDarDeBaja(p)}
              >
                Dar de baja
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section id="mis-productos">
      <div className="encabezado-mis-productos">
        <h2>Mis Productos</h2>
        <button type="button" className="btn-crear" onClick={() => setModal("nuevo")}>
          + Agregar producto
        </button>
      </div>

      {contenido()}

      <ModalProducto
        producto={modal === "nuevo" ? null : modal}
        esNuevo={modal === "nuevo"}
        categorias={categorias}
        onSubmit={modal === "nuevo" ? handleCrear : handleEditar}
        onCerrar={() => setModal(null)}
      />
    </section>
  );
}
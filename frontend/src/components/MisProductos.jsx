import { useEffect, useState } from "react";
import {
  obtenerCategorias,
  obtenerProductos,
  crearProducto,
  editarProducto,
  eliminarProducto,
} from "../api.js";
import ProductoForm from "./ProductoForm.jsx";

// TODO: cuando el backend guarde un stock mínimo por producto, usarlo acá
const STOCK_BAJO = 10;

function estadoDe(stock) {
  if (stock <= 0) return { texto: "Sin stock", clase: "estado-agotado" };
  if (stock <= STOCK_BAJO) return { texto: "Stock bajo", clase: "estado-bajo" };
  return { texto: "Disponible", clase: "estado-ok" };
}

function formatearPrecio(precio) {
  return precio.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

// `usuario` viene de useAuth, que lo lee de localStorage al abrir la app
export default function MisProductos({ usuario }) {
  const [productos, setProductos] = useState(null); // null = todavía no cargó
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState(false);
  const [errorCrud, setErrorCrud] = useState("");
  const [recarga, setRecarga] = useState(0);

  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    obtenerCategorias()
      .then(setCategorias)
      .catch((err) => console.error("No se pudieron cargar las categorías:", err));
  }, []);

  useEffect(() => {
    let cancelado = false;
    obtenerProductos({ proveedorId: usuario.id })
      .then((datos) => {
        if (cancelado) return;
        setProductos(datos);
        setError(false);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error("No se pudieron cargar tus productos:", err);
        setError(true);
      });
    return () => {
      cancelado = true;
    };
  }, [usuario.id, recarga]);

  function abrirAlta() {
    setEditando(null);
    setErrorCrud("");
    setFormAbierto(true);
  }

  function abrirEdicion(p) {
    // La API devuelve la categoría como objeto; el formulario necesita categoria_id
    setEditando({
      id: p.id,
      nombre: p.nombre,
      precio: p.precio,
      stock: p.stock,
      categoria_id: p.categoria.id,
    });
    setErrorCrud("");
    setFormAbierto(true);
  }

  function cerrarForm() {
    setEditando(null);
    setFormAbierto(false);
  }

  async function handleSubmit(data) {
    try {
      if (editando) {
        await editarProducto(editando.id, data);
      } else {
        await crearProducto({ ...data, proveedor_id: usuario.id });
      }
      setErrorCrud("");
      cerrarForm();
      setRecarga((n) => n + 1);
    } catch (err) {
      setErrorCrud(err.message);
    }
  }

  async function handleEliminar(p) {
    if (!window.confirm(`¿Eliminar "${p.nombre}"?`)) return;
    try {
      await eliminarProducto(p.id);
      setErrorCrud("");
      setRecarga((n) => n + 1);
    } catch (err) {
      setErrorCrud(err.message);
    }
  }

  const filtrados = (productos ?? []).filter((p) => {
    const coincideNombre = p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase());
    const coincideCategoria = !categoriaFiltro || String(p.categoria.id) === categoriaFiltro;
    return coincideNombre && coincideCategoria;
  });

  function cuerpoTabla() {
    if (error) {
      return (
        <tr>
          <td colSpan="7" className="tabla-vacia">No se pudo conectar con el servidor.</td>
        </tr>
      );
    }
    if (productos === null) return null;
    if (filtrados.length === 0) {
      return (
        <tr>
          <td colSpan="7" className="tabla-vacia">
            {productos.length === 0
              ? "Todavía no cargaste productos. Tocá \"+ Agregar Productos\"."
              : "No hay productos que coincidan con la búsqueda."}
          </td>
        </tr>
      );
    }
    return filtrados.map((p) => {
      const estado = estadoDe(p.stock);
      return (
        <tr key={p.id}>
          <td>
            <img
              className="miniatura"
              src={`/imagenes/${p.id}.webp`}
              alt=""
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/logo.png";
              }}
            />
          </td>
          <td>{p.nombre}</td>
          <td><span className="chip-categoria">{p.categoria.nombre}</span></td>
          <td>{formatearPrecio(p.precio)}</td>
          <td>{p.stock}</td>
          <td className={estado.clase}>{estado.texto}</td>
          <td className="celda-acciones">
            <button
              type="button"
              className="btn-icono"
              onClick={() => abrirEdicion(p)}
              aria-label={`Editar ${p.nombre}`}
              title="Editar"
            >
              ✏️
            </button>
            <button
              type="button"
              className="btn-icono"
              onClick={() => handleEliminar(p)}
              aria-label={`Eliminar ${p.nombre}`}
              title="Eliminar"
            >
              🗑️
            </button>
          </td>
        </tr>
      );
    });
  }

  return (
    <section id="mis-productos-seccion">
      <div className="cabecera-productos">
        <div>
          <h2>Mis productos</h2>
          <p className="subtitulo-productos">
            Gestioná el catálogo de productos de <strong>{usuario.nombre}</strong>
          </p>
        </div>
        <button type="button" className="btn-tan" onClick={abrirAlta}>
          + Agregar Productos
        </button>
      </div>

      {formAbierto && (
        <div className="panel-form">
          <div className="panel-form-cabecera">
            <h3>{editando ? "Editar producto" : "Nuevo producto"}</h3>
            <button type="button" className="btn-cancelar" onClick={cerrarForm}>
              Cerrar
            </button>
          </div>
          <ProductoForm
            key={editando ? editando.id : "nuevo"}
            producto={editando}
            categorias={categorias}
            onSubmit={handleSubmit}
            onCancel={cerrarForm}
          />
        </div>
      )}
      {errorCrud && <p className="error-campo">{errorCrud}</p>}

      <div className="filtros-productos">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <div className="tabla-scroll">
        <table className="tabla-productos">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>{cuerpoTabla()}</tbody>
        </table>
      </div>
    </section>
  );
}
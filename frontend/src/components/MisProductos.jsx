import { useEffect, useState } from "react";
import {
  obtenerCategorias,
  crearProducto,
  editarProducto,
  eliminarProducto,
} from "../api.js";
import ProductoForm from "./ProductoForm.jsx";
import useProductosCorralon, {
  estadoStock,
  formatearPrecio,
} from "./corralon/useProductosCorralon.js";

// `usuario` viene de useAuth, que lo lee de localStorage al abrir la app
export default function MisProductos({ usuario }) {
  const { productos, error, recargar } = useProductosCorralon(usuario.id);
  const [categorias, setCategorias] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [aviso, setAviso] = useState({ tipo: "", texto: "" });

  useEffect(() => {
    obtenerCategorias()
      .then(setCategorias)
      .catch((err) => console.error("No se pudieron cargar las categorías:", err));
  }, []);

  function abrirAlta() {
    setEditando(null);
    setAviso({ tipo: "", texto: "" });
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
    setAviso({ tipo: "", texto: "" });
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
        setAviso({ tipo: "ok", texto: "Cambios guardados." });
      } else {
        await crearProducto({ ...data, proveedor_id: usuario.id });
        setAviso({ tipo: "ok", texto: "Producto creado correctamente." });
      }
      cerrarForm();
      recargar();
    } catch (err) {
      setAviso({ tipo: "error", texto: `No se pudo guardar: ${err.message}` });
    }
  }

  async function handleEliminar(p) {
    if (!window.confirm(`¿Dar de baja "${p.nombre}"? Dejará de verse en el catálogo.`)) return;
    try {
      await eliminarProducto(p.id);
      setAviso({ tipo: "ok", texto: "Producto dado de baja." });
      recargar();
    } catch (err) {
      setAviso({ tipo: "error", texto: `No se pudo dar de baja: ${err.message}` });
    }
  }

  const filtrados = (productos ?? []).filter((p) => {
    const coincideNombre = p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase());
    const coincideCategoria = !categoriaFiltro || String(p.categoria.id) === categoriaFiltro;
    const coincideEstado = !estadoFiltro || estadoStock(p.stock).clase === estadoFiltro;
    return coincideNombre && coincideCategoria && coincideEstado;
  });

  function cuerpoTabla() {
    if (filtrados.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="cr-vacio">
            {productos.length === 0
              ? "Todavía no cargaste ningún producto."
              : "Ningún producto coincide con los filtros."}
          </td>
        </tr>
      );
    }
    return filtrados.map((p) => {
      const est = estadoStock(p.stock);
      return (
        <tr key={p.id}>
          <td>
            <div className="cr-prod">
              <img
                className="cr-miniatura"
                src={`/imagenes/${p.id}.webp`}
                alt=""
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/logo.png";
                }}
              />
              {p.nombre}
            </div>
          </td>
          <td><span className="cr-chip">{p.categoria.nombre}</span></td>
          <td>{formatearPrecio(p.precio)}</td>
          <td>{p.stock}</td>
          <td className={`cr-estado ${est.clase}`}>{est.texto}</td>
          <td className="cr-acciones">
            <button
              type="button"
              className="cr-btn-icono"
              onClick={() => abrirEdicion(p)}
              aria-label={`Editar ${p.nombre}`}
              title="Editar"
            >
              ✎
            </button>
            <button
              type="button"
              className="cr-btn-icono peligro"
              onClick={() => handleEliminar(p)}
              aria-label={`Dar de baja ${p.nombre}`}
              title="Dar de baja"
            >
              🗑
            </button>
          </td>
        </tr>
      );
    });
  }

  return (
    <section className="cr-pagina" id="mis-productos-seccion">
      <div className="cr-cabecera">
        <div>
          <h2>Mis productos</h2>
          <p className="cr-sub">
            Gestioná el catálogo de productos de <strong>{usuario.nombre}</strong>
          </p>
        </div>
        <button type="button" className="btn-tan" onClick={abrirAlta}>
          + Agregar producto
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

      {aviso.texto && (
        <p
          className={aviso.tipo === "ok" ? "mensaje-exito" : "error-campo"}
          role="status"
        >
          {aviso.texto}
        </p>
      )}

      <div className="cr-filtros">
        <input
          type="search"
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
        <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="ok">Disponible</option>
          <option value="bajo">Stock bajo</option>
          <option value="agotado">Agotado</option>
        </select>
      </div>

      {error && (
        <p className="mensaje">
          No se pudo conectar con el servidor. Verificá que la API esté encendida.
        </p>
      )}

      {productos === null && !error && (
        <>
          <div className="cr-esqueleto" />
          <div className="cr-esqueleto" />
          <div className="cr-esqueleto" />
        </>
      )}

      {productos && (
        <div className="cr-tabla-wrap">
          <table className="cr-tabla">
            <thead>
              <tr>
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
      )}
    </section>
  );
}
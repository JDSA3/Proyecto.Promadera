import { useEffect, useState } from "react";
import {
  obtenerCategorias,
  obtenerProductos,
  crearProducto,
  editarProducto,
  eliminarProducto,
} from "../api.js";
import ProductoCard from "./ProductoCard.jsx";
import ProductoForm from "./ProductoForm.jsx";

export default function Productos({favoritos, onAlternarFavorito}) {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState(null); // null = todavía no cargó
  const [error, setError] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [busquedaEspera, setBusquedaEspera] = useState("");
  const [categoriaId, setCategoriaId] = useState("");

  // CRUD
  const [editando, setEditando] = useState(null);
  const [errorCrud, setErrorCrud] = useState("");
  const [recarga, setRecarga] = useState(0); // al sumarle 1, se vuelve a pedir la lista

  // Cargar categorías una sola vez, al montar el componente
  useEffect(() => {
    obtenerCategorias()
      .then(setCategorias)
      .catch((err) => console.error("No se pudieron cargar las categorías:", err));
  }, []);

  // Espera 300 ms después de dejar de escribir antes de buscar
  useEffect(() => {
    const temporizador = setTimeout(() => setBusquedaEspera(busqueda.trim()), 300);
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  // Cargar productos al inicio y cada vez que cambia la búsqueda, la categoría o "recarga"
  useEffect(() => {
    let cancelado = false;
    obtenerProductos({ query: busquedaEspera, categoriaId })
      .then((datos) => {
        if (cancelado) return;
        setProductos(datos);
        setError(false);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error("No se pudieron cargar los productos:", err);
        setError(true);
      });
    return () => {
      cancelado = true;
    };
  }, [busquedaEspera, categoriaId, recarga]);

  async function handleSubmit(data) {
    try {
      if (editando) {
        await editarProducto(editando.id, data);
        setEditando(null);
      } else {
        await crearProducto(data);
      }
      setErrorCrud("");
      setRecarga((n) => n + 1);
    } catch (err) {
      setErrorCrud(err.message);
    }
  }

  async function handleEliminar(id) {
    if (!window.confirm("¿Eliminar este producto?")) return;
    try {
      await eliminarProducto(id);
      setErrorCrud("");
      setRecarga((n) => n + 1);
    } catch (err) {
      setErrorCrud(err.message);
    }
  }

  const activos = productos ? productos.filter((p) => p.activo) : [];

  function contenido() {
    if (error) {
      return (
        <p className="mensaje">
          No se pudo conectar con el servidor. Verifica que la API esté encendida.
        </p>
      );
    }
    if (productos === null) return null;
    if (activos.length === 0) {
      return <p className="mensaje">No se encontraron productos con esa búsqueda.</p>;
    }
    return activos.map((p) => (
    <div key={p.id} className="producto-item">
    <ProductoCard
      producto={p}
      esFavorito={favoritos.includes(p.id)}
      onAlternarFavorito={onAlternarFavorito}
    />

    <div className="acciones-producto">
      <button className="btn-editar" onClick={() => setEditando(p)}>Editar</button>
      <button className="btn-eliminar" onClick={() => handleEliminar(p.id)}>Eliminar</button>
    </div>
  </div>
));
  }

  return (
    <section id="insumos">
      <h2>Productos</h2>

      <ProductoForm
        producto={editando}
        categorias={categorias}
        onSubmit={handleSubmit}
        onCancel={() => setEditando(null)}
      />
      {errorCrud && <p style={{ color: "red" }}>{errorCrud}</p>}

      <div className="filtros">
        <input
          type="text"
          id="buscador"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          id="categoria"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div id="productos">{contenido()}</div>
    </section>
  );
}
import { useEffect, useState } from "react";
import { obtenerCategorias, obtenerProductos } from "../api.js";
import ProductoCard from "./ProductoCard.jsx";
import ProductoDetalle from "./ProductoDetalle.jsx";

export default function Productos({
  favoritos,
  onAlternarFavorito,
  onAgregarAlCarrito,
}) {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState(null); // null = todavía no cargó
  const [error, setError] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [busquedaEspera, setBusquedaEspera] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [proveedorId, setProveedorId] = useState("");
  const [corralones, setCorralones] = useState([]);

  // Cargar categorías una sola vez, al montar el componente
  useEffect(() => {
    obtenerCategorias()
      .then(setCategorias)
      .catch((err) =>
        console.error("No se pudieron cargar las categorías:", err),
      );
  }, []);

  // Lista de corralones para el filtro: sale de los productos que traen proveedor_nombre
  useEffect(() => {
    obtenerProductos()
      .then((datos) => {
        const porId = new Map();
        datos.forEach((p) => {
          if (p.proveedor_id && p.proveedor_nombre)
            porId.set(p.proveedor_id, p.proveedor_nombre);
        });
        setCorralones(
          [...porId]
            .map(([id, nombre]) => ({ id, nombre }))
            .sort((a, b) => a.id - b.id),
        );
      })
      .catch((err) =>
        console.error("No se pudieron cargar los corralones:", err),
      );
  }, []);

  // Espera 300 ms después de dejar de escribir antes de buscar
  useEffect(() => {
    const temporizador = setTimeout(
      () => setBusquedaEspera(busqueda.trim()),
      300,
    );
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  // Cargar productos al inicio y cada vez que cambia la búsqueda o la categoría
  useEffect(() => {
    let cancelado = false;
    obtenerProductos({ query: busquedaEspera, categoriaId, proveedorId })
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
  }, [busquedaEspera, categoriaId, proveedorId]);

  const activos = productos ? productos.filter((p) => p.activo) : [];

  function contenido() {
    if (error) {
      return (
        <p className="mensaje">
          No se pudo conectar con el servidor. Verifica que la API esté
          encendida.
        </p>
      );
    }
    if (productos === null) return null;
    if (activos.length === 0) {
      return (
        <p className="mensaje">No se encontraron productos con esa búsqueda.</p>
      );
    }
    return activos.map((p) => (
      <ProductoCard
        key={p.id}
        producto={p}
        esFavorito={favoritos.includes(p.id)}
        onAlternarFavorito={onAlternarFavorito}
        onVerDetalle={setDetalle}
      />
    ));
  }

  return (
    <section id="insumos">
      <h2>Insumos</h2>

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

        <select
          id="corralon"
          value={proveedorId}
          onChange={(e) => setProveedorId(e.target.value)}
        >
          <option value="">Todos los corralones</option>
          {corralones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div id="productos">{contenido()}</div>

      <ProductoDetalle
        producto={detalle}
        esFavorito={detalle ? favoritos.includes(detalle.id) : false}
        onAlternarFavorito={onAlternarFavorito}
        onCerrar={() => setDetalle(null)}
        onVerDetalle={setDetalle}
        onAgregarAlCarrito={onAgregarAlCarrito}
      />
    </section>
  );
}

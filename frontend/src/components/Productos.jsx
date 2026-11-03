import { useEffect, useState } from "react";
import { obtenerCategorias, obtenerProductos } from "../api.js";
import ProductoCard from "./ProductoCard.jsx";
import ProductoDetalle from "./ProductoDetalle.jsx";
import Paginador from "./Paginador.jsx";
import { estadoDe } from "../stock.js";

const POR_PAGINA = 12;

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
  const [pagina, setPagina] = useState(1);
  const [disponibilidad, setDisponibilidad] = useState("");


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

  
  // Al cambiar la búsqueda o los filtros se vuelve a la primera página
  useEffect(() => {
    setPagina(1);
  }, [busquedaEspera, categoriaId, proveedorId, disponibilidad]);

  const activos = productos
  ? productos.filter((p) => {
    if (!p.activo) return false;
    if (disponibilidad === "") return true;
    if (disponibilidad === "disponible") return p.stock > 0;
      return estadoDe(p.stock).id === disponibilidad; // "bajo" o "agotado"
    })
    : [];
  const totalPaginas = Math.max(1, Math.ceil(activos.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * POR_PAGINA;
  const visibles = activos.slice(desde, desde + POR_PAGINA);

  function irAPagina(n) {
    setPagina(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
    return visibles.map((p) => (

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

        <select
          id="disponibilidad"
          value={disponibilidad}
          onChange={(e) => setDisponibilidad(e.target.value)}
          aria-label="Filtrar por disponibilidad"
        >
          <option value="">Toda la disponibilidad</option>
          <option value="disponible">Con stock</option>
          <option value="bajo">Últimas unidades</option>
          <option value="agotado">Sin stock</option>
        </select>
      </div>

      <div id="productos">{contenido()}</div>
          
      
      {activos.length > 0 && (
        <p className="paginador-resumen">
          Mostrando {desde + 1} a {desde + visibles.length} de {activos.length} productos
        </p>
      )}
      <Paginador
        pagina={paginaActual}
        totalPaginas={totalPaginas}
        onCambiar={irAPagina}
      />

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

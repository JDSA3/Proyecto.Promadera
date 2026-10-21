import { useEffect, useState } from "react";
import { editarProducto, obtenerProductos } from "../api.js";
import { STOCK_BAJO, estadoDe } from "../stock.js";
import "./Stock.css";

function formatearPrecio(precio) {
  return precio.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

const FILTROS = [
  { id: "todos", etiqueta: "Todos" },
  { id: "bajo", etiqueta: "Stock bajo" },
  { id: "agotado", etiqueta: "Sin stock" },
];

// Celda con los controles para cambiar el stock de un producto:
// -1, +1, +10 y un campo para escribir la cantidad exacta (se guarda con Enter o al salir del campo).
function CeldaStock({ producto, deshabilitado, onGuardar }) {
  const [borrador, setBorrador] = useState(String(producto.stock));

  // Si el stock cambia desde afuera (por ejemplo, al revertir un error), actualizar el campo.
  useEffect(() => {
    setBorrador(String(producto.stock));
  }, [producto.stock]);

  function confirmar() {
    const numero = Number(borrador);
    if (borrador.trim() === "" || !Number.isInteger(numero) || numero < 0) {
      setBorrador(String(producto.stock)); // valor inválido: volver al anterior
      return;
    }
    onGuardar(producto, numero);
  }

  const cambiar = (delta) => onGuardar(producto, Math.max(0, producto.stock + delta));

  return (
    <div className="stock-control">
      <button
        type="button"
        className="stock-btn"
        onClick={() => cambiar(-1)}
        disabled={deshabilitado || producto.stock <= 0}
        aria-label={`Restar 1 al stock de ${producto.nombre}`}
      >
        −
      </button>
      <input
        type="number"
        className="stock-input"
        min="0"
        step="1"
        value={borrador}
        disabled={deshabilitado}
        onChange={(e) => setBorrador(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setBorrador(String(producto.stock));
            e.currentTarget.blur();
          }
        }}
        aria-label={`Stock de ${producto.nombre}`}
      />
      <button
        type="button"
        className="stock-btn"
        onClick={() => cambiar(1)}
        disabled={deshabilitado}
        aria-label={`Sumar 1 al stock de ${producto.nombre}`}
      >
        +
      </button>
      <button
        type="button"
        className="stock-btn stock-btn-diez"
        onClick={() => cambiar(10)}
        disabled={deshabilitado}
        aria-label={`Sumar 10 al stock de ${producto.nombre}`}
      >
        +10
      </button>
    </div>
  );
}

// Pantalla "Stock" del Corralón: ver y ajustar el stock de sus productos.
export default function Stock({ usuario }) {
  const [productos, setProductos] = useState(null); // null = todavía no cargó
  const [error, setError] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState("");
  const [guardando, setGuardando] = useState([]); // ids que se están guardando

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");

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
        console.error("No se pudo cargar el stock:", err);
        setError(true);
      });
    return () => {
      cancelado = true;
    };
  }, [usuario.id]);

  function cambiarStockLocal(id, stock) {
    setProductos((lista) => lista.map((p) => (p.id === id ? { ...p, stock } : p)));
  }

  async function guardarStock(producto, nuevoStock) {
    if (nuevoStock === producto.stock) return;
    const anterior = producto.stock;

    // Se actualiza la pantalla al instante y, si el servidor falla, se vuelve atrás.
    cambiarStockLocal(producto.id, nuevoStock);
    setGuardando((ids) => [...ids, producto.id]);
    try {
      await editarProducto(producto.id, { stock: nuevoStock });
      setErrorEdicion("");
    } catch (err) {
      cambiarStockLocal(producto.id, anterior);
      setErrorEdicion(`No se pudo actualizar "${producto.nombre}": ${err.message}`);
    } finally {
      setGuardando((ids) => ids.filter((id) => id !== producto.id));
    }
  }

  const lista = productos ?? [];
  const resumen = {
    total: lista.length,
    bajo: lista.filter((p) => estadoDe(p.stock).id === "bajo").length,
    agotado: lista.filter((p) => estadoDe(p.stock).id === "agotado").length,
    valor: lista.reduce((suma, p) => suma + p.precio * p.stock, 0),
  };

  const filtrados = lista.filter((p) => {
    const coincideNombre = p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase());
    const coincideEstado = filtro === "todos" || estadoDe(p.stock).id === filtro;
    return coincideNombre && coincideEstado;
  });

  function cuerpoTabla() {
    if (error) {
      return (
        <tr>
          <td colSpan="4" className="cr-vacio">No se pudo conectar con el servidor.</td>
        </tr>
      );
    }
    if (productos === null) return null;
    if (filtrados.length === 0) {
      return (
        <tr>
          <td colSpan="4" className="cr-vacio">
            {lista.length === 0
              ? "Todavía no tenés productos. Cargalos desde \"Mis Productos\"."
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
          <td>
            <CeldaStock
              producto={p}
              deshabilitado={guardando.includes(p.id)}
              onGuardar={guardarStock}
            />
          </td>
          <td className={`cr-estado ${estado.id}`}>{estado.texto}</td>
        </tr>
      );
    });
  }

  return (
    <section className="cr-pagina" id="stock-seccion">
      <div className="cr-cabecera">
        <div>
          <h2>Control de stock</h2>
          <p className="cr-sub">
            Revisá y actualizá el stock de tus productos. Se avisa como "stock bajo" cuando
            quedan {STOCK_BAJO} unidades o menos.
          </p>
        </div>
      </div>

      <div className="stock-resumen">
        <div className="stock-tarjeta">
          <span className="stock-tarjeta-valor">{resumen.total}</span>
          <span className="stock-tarjeta-texto">Productos</span>
        </div>
        <button
          type="button"
          className={`stock-tarjeta stock-tarjeta-boton estado-bajo-borde${filtro === "bajo" ? " activa" : ""}`}
          onClick={() => setFiltro(filtro === "bajo" ? "todos" : "bajo")}
          aria-pressed={filtro === "bajo"}
        >
          <span className="stock-tarjeta-valor">{resumen.bajo}</span>
          <span className="stock-tarjeta-texto">Con stock bajo</span>
        </button>
        <button
          type="button"
          className={`stock-tarjeta stock-tarjeta-boton estado-agotado-borde${filtro === "agotado" ? " activa" : ""}`}
          onClick={() => setFiltro(filtro === "agotado" ? "todos" : "agotado")}
          aria-pressed={filtro === "agotado"}
        >
          <span className="stock-tarjeta-valor">{resumen.agotado}</span>
          <span className="stock-tarjeta-texto">Sin stock</span>
        </button>
        <div className="stock-tarjeta">
          <span className="stock-tarjeta-valor">{formatearPrecio(resumen.valor)}</span>
          <span className="stock-tarjeta-texto">Valor del stock</span>
        </div>
      </div>

      {errorEdicion && <p className="error-campo" role="alert">{errorEdicion}</p>}

      <div className="cr-filtros">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          {FILTROS.map((f) => (
            <option key={f.id} value={f.id}>{f.etiqueta}</option>
          ))}
        </select>
      </div>

      {productos === null && !error && (
        <>
          <div className="cr-esqueleto" />
          <div className="cr-esqueleto" />
        </>
      )}

      <div className="cr-tabla-wrap">
        <table className="cr-tabla">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Stock</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>{cuerpoTabla()}</tbody>
        </table>
      </div>
    </section>
  );
}

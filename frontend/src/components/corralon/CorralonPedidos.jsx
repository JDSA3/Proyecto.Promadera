import { Fragment, useEffect, useState } from "react";
import { obtenerPedidos } from "../../api.js";
import "./CorralonPedidos.css";

// Los estados son los que devuelve la API de pedidos: pendiente, pagado y cancelado.
const FILTROS = [
  { id: "todos", etiqueta: "Todos" },
  { id: "pendiente", etiqueta: "Pendientes" },
  { id: "pagado", etiqueta: "Pagados" },
  { id: "cancelado", etiqueta: "Cancelados" },
];

// "clase" reutiliza los colores de .cr-estado (ok = verde, bajo = ámbar, agotado = rojo).
const ESTADOS = {
  pendiente: { texto: "Pendiente", clase: "bajo" },
  pagado: { texto: "Pagado", clase: "ok" },
  cancelado: { texto: "Cancelado", clase: "agotado" },
};

function formatearPrecio(n) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function formatearFecha(iso) {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

// Pedidos que incluyen productos de este corralón. Cada pedido muestra solo sus items
// y el total es la suma de esos items (así lo calcula la API con proveedor_id).
export default function CorralonPedidos({ usuario }) {
  const [pedidos, setPedidos] = useState(null); // null = cargando
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [filtro, setFiltro] = useState("todos");
  const [abierto, setAbierto] = useState(null); // id del pedido con el detalle desplegado

  useEffect(() => {
    let cancelado = false;
    obtenerPedidos({ proveedorId: usuario.id })
      .then((datos) => {
        if (cancelado) return;
        setPedidos(datos);
        setError(false);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error("No se pudieron cargar los pedidos:", err);
        setError(true);
      });
    return () => {
      cancelado = true;
    };
  }, [usuario.id, recarga]);

  const lista = pedidos ?? [];
  const cantidad = (id) => (id === "todos" ? lista.length : lista.filter((p) => p.estado === id).length);
  const filtrados = lista.filter((p) => filtro === "todos" || p.estado === filtro);

  function cuerpoTabla() {
    if (error) {
      return (
        <tr>
          <td colSpan="6" className="cr-vacio">No se pudo conectar con el servidor.</td>
        </tr>
      );
    }
    if (pedidos === null) return null;
    if (filtrados.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="cr-vacio">
            {lista.length === 0 ? "Todavía no recibiste pedidos." : "No hay pedidos con ese estado."}
          </td>
        </tr>
      );
    }
    return filtrados.map((p) => {
      const estado = ESTADOS[p.estado] ?? { texto: p.estado, clase: "" };
      const desplegado = abierto === p.id;
      return (
        <Fragment key={p.id}>
          <tr>
            <td>#{p.id}</td>
            <td>{formatearFecha(p.creado_en)}</td>
            <td>{p.cliente.nombre}</td>
            <td>{formatearPrecio(p.total)}</td>
            <td className={`cr-estado ${estado.clase}`}>{estado.texto}</td>
            <td className="cr-acciones">
              <button
                type="button"
                className="cr-btn-icono"
                aria-expanded={desplegado}
                onClick={() => setAbierto(desplegado ? null : p.id)}
              >
                {desplegado ? "Ocultar detalle" : "Ver detalle"}
              </button>
            </td>
          </tr>
          {desplegado && (
            <tr className="cr-pedido-detalle">
              <td colSpan="6">
                <table className="cr-pedido-items">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio unitario</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.items.map((item) => (
                      <tr key={item.producto_id}>
                        <td>{item.nombre}</td>
                        <td>{item.cantidad}</td>
                        <td>{formatearPrecio(item.precio_unitario)}</td>
                        <td>{formatearPrecio(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>
          )}
        </Fragment>
      );
    });
  }

  return (
    <section className="cr-pagina">
      <div className="cr-cabecera">
        <div>
          <h2>Pedidos</h2>
          <p className="cr-sub">Pedidos que incluyen productos de tu corralón.</p>
        </div>
        <button type="button" className="cr-btn-icono" onClick={() => setRecarga((n) => n + 1)}>
          ↻ Actualizar
        </button>
      </div>

      <div className="cr-pills">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={f.id === filtro ? "cr-pill activo" : "cr-pill"}
            onClick={() => setFiltro(f.id)}
          >
            {f.etiqueta} ({cantidad(f.id)})
          </button>
        ))}
      </div>

      {pedidos === null && !error && (
        <>
          <div className="cr-esqueleto" />
          <div className="cr-esqueleto" />
        </>
      )}

      <div className="cr-tabla-wrap">
        <table className="cr-tabla">
          <thead>
            <tr>
              <th>N° Pedido</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total</th>
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

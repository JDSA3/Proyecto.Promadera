import { Fragment, useEffect, useState } from "react";
import { crearPreferenciaPago, obtenerPedidos, simularPago } from "../api.js";
import "./Carrito.css";
import "./corralon/CorralonPedidos.css"; // detalle desplegable de un pedido

// Estados que devuelve la API. "clase" reutiliza los colores de .cr-estado.
const ESTADOS = {
  pendiente: { texto: "Pendiente de pago", clase: "bajo" },
  pagado: { texto: "Pagado", clase: "ok" },
  cancelado: { texto: "Cancelado", clase: "agotado" },
};

const dinero = (n) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const fecha = (iso) => new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
const limpiar = (msg) => String(msg).replace(/^"|"$/g, "");

// Pedidos del carpintero. Sirve también para pagar un pedido que quedó pendiente
// (por ejemplo, si salió del carrito antes de pagar).
export default function MisPedidos({ usuario }) {
  const [pedidos, setPedidos] = useState(null); // null = cargando
  const [error, setError] = useState(false);
  const [aviso, setAviso] = useState({ tipo: "", texto: "" });
  const [recarga, setRecarga] = useState(0);
  const [abierto, setAbierto] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    obtenerPedidos({ clienteId: usuario.id })
      .then((datos) => {
        if (cancelado) return;
        setPedidos(datos);
        setError(false);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error("No se pudieron cargar tus pedidos:", err);
        setError(true);
      });
    return () => {
      cancelado = true;
    };
  }, [usuario.id, recarga]);

  async function ejecutar(accion) {
    setTrabajando(true);
    setAviso({ tipo: "", texto: "" });
    try {
      await accion();
    } catch (err) {
      setAviso({ tipo: "error", texto: limpiar(err.message) });
    } finally {
      setTrabajando(false);
    }
  }

  const pagarConMercadoPago = (pedido) =>
    ejecutar(async () => {
      const pref = await crearPreferenciaPago(pedido.id);
      window.location.href = pref.init_point;
    });

  const pagarSimulado = (pedido) =>
    ejecutar(async () => {
      await simularPago(pedido.id);
      setAviso({ tipo: "ok", texto: `¡Pago registrado! El pedido #${pedido.id} quedó pagado.` });
      setRecarga((n) => n + 1);
    });

  function cuerpoTabla() {
    if (error) {
      return (
        <tr>
          <td colSpan="5" className="cr-vacio">No se pudo conectar con el servidor.</td>
        </tr>
      );
    }
    if (pedidos === null) return null;
    if (pedidos.length === 0) {
      return (
        <tr>
          <td colSpan="5" className="cr-vacio">Todavía no hiciste pedidos.</td>
        </tr>
      );
    }
    return pedidos.map((p) => {
      const estado = ESTADOS[p.estado] ?? { texto: p.estado, clase: "" };
      const desplegado = abierto === p.id;
      return (
        <Fragment key={p.id}>
          <tr>
            <td>#{p.id}</td>
            <td>{fecha(p.creado_en)}</td>
            <td>{dinero(p.total)}</td>
            <td className={`cr-estado ${estado.clase}`}>{estado.texto}</td>
            <td className="cr-acciones">
              <button
                type="button"
                className="cr-btn-icono"
                aria-expanded={desplegado}
                onClick={() => setAbierto(desplegado ? null : p.id)}
              >
                {desplegado ? "Ocultar" : p.estado === "pendiente" ? "Ver y pagar" : "Ver detalle"}
              </button>
            </td>
          </tr>
          {desplegado && (
            <tr className="cr-pedido-detalle">
              <td colSpan="5">
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
                        <td>{dinero(item.precio_unitario)}</td>
                        <td>{dinero(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {p.estado === "pendiente" && (
                  <div className="carrito-resumen">
                    <span className="carrito-total">Total: {dinero(p.total)}</span>
                    <div className="carrito-acciones">
                      <button
                        type="button"
                        className="btn-tan"
                        disabled={trabajando}
                        onClick={() => pagarConMercadoPago(p)}
                      >
                        Pagar con Mercado Pago
                      </button>
                      <button
                        type="button"
                        className="btn-secundario"
                        disabled={trabajando}
                        onClick={() => pagarSimulado(p)}
                      >
                        Simular pago
                      </button>
                    </div>
                  </div>
                )}
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
          <h2>Mis pedidos</h2>
          <p className="cr-sub">Seguí el estado de tus compras y pagá los pedidos pendientes.</p>
        </div>
        <button type="button" className="cr-btn-icono" onClick={() => setRecarga((n) => n + 1)}>
          ↻ Actualizar
        </button>
      </div>

      {aviso.texto && (
        <p
          className={aviso.tipo === "ok" ? "mensaje-exito" : "error-campo"}
          role={aviso.tipo === "ok" ? "status" : "alert"}
        >
          {aviso.texto}
        </p>
      )}

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

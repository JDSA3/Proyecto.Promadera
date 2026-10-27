import { Fragment, useEffect, useState } from "react";
import {
  cambiarEstadoCorralon,
  cancelarPedido,
  crearPreferenciaPago,
  obtenerPedidos,
  simularPago,
} from "../api.js";
import "./Carrito.css";
import "./corralon/CorralonPedidos.css"; // detalle desplegable de un pedido
import "./MisPedidos.css";
import { nombreItem } from "../cortes.js";

// Estado del pedido (el pago). "clase" reutiliza los colores de .cr-estado.
const ESTADOS = {
  pendiente: { texto: "Pendiente de pago", clase: "bajo" },
  pagado: { texto: "Pagado", clase: "ok" },
  cancelado: { texto: "Cancelado", clase: "agotado" },
};

// Estado de la parte de cada corralón.
const ESTADOS_CORRALON = {
  pendiente: { texto: "Pendiente", clase: "bajo" },
  confirmado: { texto: "Confirmado", clase: "ok" },
  enviado: { texto: "Enviado", clase: "ok" },
  entregado: { texto: "Entregado", clase: "ok" },
  devuelto: { texto: "Devuelto", clase: "agotado" },
  cancelado: { texto: "Cancelado", clase: "agotado" },
};

const dinero = (n) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const fecha = (iso) => new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
const limpiar = (msg) => String(msg).replace(/^"|"$/g, "");

// Pedidos del carpintero. Cada pedido muestra el estado de cada corralón por separado.
// Sirve también para pagar un pedido pendiente, cancelarlo o reportar un problema con el material.
export default function MisPedidos({ usuario }) {
  const [pedidos, setPedidos] = useState(null); // null = cargando
  const [error, setError] = useState(false);
  const [aviso, setAviso] = useState({ tipo: "", texto: "" });
  const [recarga, setRecarga] = useState(0);
  const [abierto, setAbierto] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const [reporte, setReporte] = useState(null); // { pedidoId, proveedorId, nombre }
  const [motivo, setMotivo] = useState("");

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
      setAviso({ tipo: "ok", texto: `¡Pago confirmado! El pedido #${pedido.id} quedó pagado.` });
      setRecarga((n) => n + 1);
    });

  function cancelar(pedido) {
    const seguro = window.confirm(
      `¿Cancelar el pedido #${pedido.id}? Se devuelve el stock y no se puede deshacer.`
    );
    if (!seguro) return;
    ejecutar(async () => {
      await cancelarPedido({ pedidoId: pedido.id, usuarioId: usuario.id });
      setAviso({ tipo: "ok", texto: `El pedido #${pedido.id} fue cancelado.` });
      setRecarga((n) => n + 1);
    });
  }

  function abrirReporte(pedido, corralon) {
    setMotivo("");
    setReporte({
      pedidoId: pedido.id,
      proveedorId: corralon.proveedor_id,
      nombre: corralon.proveedor_nombre || `Corralón #${corralon.proveedor_id}`,
    });
  }

  function cerrarReporte() {
    setReporte(null);
    setMotivo("");
  }

  const enviarReporte = () =>
    ejecutar(async () => {
      await cambiarEstadoCorralon({
        pedidoId: reporte.pedidoId,
        proveedorId: reporte.proveedorId,
        usuarioId: usuario.id,
        estado: "devuelto",
        motivo: motivo.trim(),
      });
      setAviso({
        tipo: "ok",
        texto: `Reportaste un problema con ${reporte.nombre}. Esa parte del pedido quedó como devuelta.`,
      });
      cerrarReporte();
      setRecarga((n) => n + 1);
    });

  function detalleCorralones(p) {
    return (p.corralones ?? []).map((c, idx) => {
      const est = ESTADOS_CORRALON[c.estado] ?? { texto: c.estado, clase: "" };
      return (
        <section className="cr-grupo" key={c.proveedor_id ?? idx}>
          <header className="cr-grupo-encabezado">
            <span className="cr-grupo-etiqueta">c{idx + 1}</span>
            <h3 className="cr-grupo-nombre">
              {c.proveedor_nombre || `Corralón #${c.proveedor_id}`}
            </h3>
            <span className={`cr-estado ${est.clase}`}>{est.texto}</span>
            <span className="cr-grupo-total">{dinero(c.total)}</span>
          </header>

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
              {c.items.map((item) => (
                <tr key={item.producto_id}>
                  <td>{nombreItem(item)}</td>
                  <td>{item.cantidad}</td>
                  <td>{dinero(item.precio_unitario)}</td>
                  <td>{dinero(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {c.estado === "devuelto" && (
            <p className="mp-motivo">Motivo de la devolución: {c.motivo_devolucion}</p>
          )}

          {c.estado === "entregado" && (
            <div className="mp-acciones">
              <button
                type="button"
                className="mp-btn-peligro"
                disabled={trabajando}
                onClick={() => abrirReporte(p, c)}
              >
                Reportar problema
              </button>
            </div>
          )}
        </section>
      );
    });
  }

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
                {detalleCorralones(p)}
                {p.estado === "pendiente" && (
                  <div className="carrito-resumen">
                    <span className="carrito-total">Total: {dinero(p.total)}</span>
                    <div className="carrito-acciones">
                      <button
                        type="button"
                        className="mp-btn-peligro"
                        disabled={trabajando}
                        onClick={() => cancelar(p)}
                      >
                        Cancelar pedido
                      </button>
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
          <p className="cr-sub">
            Seguí el estado de cada corralón, pagá los pedidos pendientes y reportá problemas con el material.
          </p>
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

      {reporte && (
        <div className="mp-modal-fondo" role="dialog" aria-modal="true" aria-labelledby="mp-titulo">
          <div className="mp-modal">
            <h3 id="mp-titulo">Reportar problema</h3>
            <p>
              Contanos qué pasó con el material de <strong>{reporte.nombre}</strong>. Esa parte del
              pedido va a quedar como devuelta.
            </p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={300}
              placeholder="Ej.: llegaron 3 tableros rajados"
              aria-label="Motivo del problema"
            />
            <div className="mp-modal-acciones">
              <button type="button" className="btn-secundario" disabled={trabajando} onClick={cerrarReporte}>
                Volver
              </button>
              <button
                type="button"
                className="mp-btn-peligro"
                disabled={trabajando || !motivo.trim()}
                onClick={enviarReporte}
              >
                {trabajando ? "Enviando..." : "Confirmar reporte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

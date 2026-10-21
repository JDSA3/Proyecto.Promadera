import { useState } from "react";
import { crearPedido, crearPreferenciaPago, simularPago } from "../api.js";
import "./Carrito.css";

const dinero = (n) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const limpiar = (msg) => String(msg).replace(/^"|"$/g, "");

export default function Carrito({ usuario, carrito, onSeguirComprando }) {
  const { items, cambiarCantidad, quitar, vaciar, total } = carrito;
  const [pedido, setPedido] = useState(null); // pedido ya creado, pendiente de pago
  const [pagado, setPagado] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");

  async function ejecutar(accion) {
    setTrabajando(true);
    setError("");
    try {
      await accion();
    } catch (err) {
      setError(limpiar(err.message));
    } finally {
      setTrabajando(false);
    }
  }

  const confirmarPedido = () =>
    ejecutar(async () => {
      const nuevo = await crearPedido({ clienteId: usuario.id, items });
      setPedido(nuevo);
      vaciar();
    });

  const pagarConMercadoPago = () =>
    ejecutar(async () => {
      const pref = await crearPreferenciaPago(pedido.id);
      window.location.href = pref.init_point;
    });

  const pagarSimulado = () =>
    ejecutar(async () => {
      await simularPago(pedido.id);
      setPagado(true);
    });

  if (pagado) {
    return (
      <section className="carrito-pagina">
        <h2>Carrito</h2>
        <p className="mensaje-exito" role="status">
          ¡Pago registrado! Tu pedido #{pedido.id} por {dinero(pedido.total)} quedó pagado.
        </p>
        <button type="button" className="btn-tan" onClick={onSeguirComprando}>
          Seguir comprando
        </button>
      </section>
    );
  }

  if (pedido) {
    return (
      <section className="carrito-pagina">
        <h2>Pedido #{pedido.id}</h2>
        <p className="cr-sub">Tu pedido está creado y pendiente de pago.</p>
        <div className="cr-tabla-wrap">
          <table className="cr-tabla">
            <thead>
              <tr><th>Producto</th><th>Cantidad</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
              {pedido.items.map((i) => (
                <tr key={i.producto_id}>
                  <td>{i.nombre}</td>
                  <td>{i.cantidad}</td>
                  <td>{dinero(i.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="carrito-resumen">
          <span className="carrito-total">Total: {dinero(pedido.total)}</span>
          <div className="carrito-acciones">
            <button type="button" className="btn-tan" disabled={trabajando} onClick={pagarConMercadoPago}>
              Pagar con Mercado Pago
            </button>
            <button type="button" className="btn-secundario" disabled={trabajando} onClick={pagarSimulado}>
              Simular pago
            </button>
          </div>
        </div>
        {error && <p className="error-campo" role="alert">{error}</p>}
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="carrito-pagina">
        <h2>Carrito</h2>
        <p className="mensaje">Tu carrito está vacío.</p>
        <button type="button" className="btn-tan" onClick={onSeguirComprando}>
          Ver insumos
        </button>
      </section>
    );
  }

  return (
    <section className="carrito-pagina">
      <h2>Carrito</h2>
      <div className="cr-tabla-wrap">
        <table className="cr-tabla">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Precio</th>
              <th>Cantidad</th>
              <th>Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.producto_id}>
                <td>{i.nombre}</td>
                <td>{dinero(i.precio)}</td>
                <td>
                  <span className="carrito-cantidad">
                    <button
                      type="button"
                      aria-label={`Quitar una unidad de ${i.nombre}`}
                      disabled={i.cantidad <= 1}
                      onClick={() => cambiarCantidad(i.producto_id, i.cantidad - 1)}
                    >
                      −
                    </button>
                    {i.cantidad}
                    <button
                      type="button"
                      aria-label={`Agregar una unidad de ${i.nombre}`}
                      disabled={i.cantidad >= i.stock}
                      onClick={() => cambiarCantidad(i.producto_id, i.cantidad + 1)}
                    >
                      +
                    </button>
                  </span>
                </td>
                <td>{dinero(i.precio * i.cantidad)}</td>
                <td>
                  <button
                    type="button"
                    className="cr-btn-icono peligro"
                    aria-label={`Quitar ${i.nombre} del carrito`}
                    onClick={() => quitar(i.producto_id)}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="carrito-resumen">
        <span className="carrito-total">Total: {dinero(total)}</span>
        <div className="carrito-acciones">
          <button type="button" className="btn-secundario" onClick={onSeguirComprando}>
            Seguir comprando
          </button>
          <button type="button" className="btn-tan" disabled={trabajando} onClick={confirmarPedido}>
            {trabajando ? "Creando pedido..." : "Confirmar pedido"}
          </button>
        </div>
      </div>
      {error && <p className="error-campo" role="alert">{error}</p>}
    </section>
  );
}

import { useState } from "react";
import { crearPedido, crearPreferenciaPago, simularPago } from "../api.js";
import "./Carrito.css";

const dinero = (n) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const limpiar = (msg) => String(msg).replace(/^"|"$/g, "");

// Agrupa los items del carrito por corralón. El de id más bajo es c1, el siguiente c2, etc.
// Los productos sin corralón van al final, en un grupo "Sin corralón".
function agruparPorCorralon(items) {
  const grupos = new Map();
  for (const i of items) {
    const clave = i.proveedor_id ?? "sin";
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        clave,
        proveedorId: i.proveedor_id ?? null,
        nombre: i.proveedor_id ? i.proveedor_nombre || `Corralón #${i.proveedor_id}` : "Sin corralón",
        items: [],
        subtotal: 0,
      });
    }
    const grupo = grupos.get(clave);
    grupo.items.push(i);
    grupo.subtotal += i.precio * i.cantidad;
  }
  return [...grupos.values()].sort((a, b) => {
    if (a.proveedorId === null) return 1;
    if (b.proveedorId === null) return -1;
    return a.proveedorId - b.proveedorId;
  });
}

function EncabezadoCorralon({ numero, nombre, total, estado }) {
  return (
    <header className="cr-grupo-encabezado">
      <span className="cr-grupo-etiqueta">c{numero}</span>
      <h3 className="cr-grupo-nombre">{nombre}</h3>
      {estado && <span className={`cr-estado cr-estado-${estado}`}>{estado}</span>}
      <span className="cr-grupo-total">{dinero(total)}</span>
    </header>
  );
}

export default function Carrito({ usuario, carrito, onSeguirComprando, onVerPedidos }) {
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

  // 3) Pago confirmado
  if (pagado) {
    return (
      <section className="carrito-pagina">
        <h2>Carrito</h2>
        <p className="mensaje-exito" role="status">
          ¡Pago confirmado! Tu pedido #{pedido.id} por {dinero(pedido.total)} quedó pagado.
          Cada corralón va a confirmar y enviar su parte.
        </p>
        <div className="carrito-acciones">
          {onVerPedidos && (
            <button type="button" className="btn-secundario" onClick={onVerPedidos}>
              Ver mis pedidos
            </button>
          )}
          <button type="button" className="btn-tan" onClick={onSeguirComprando}>
            Seguir comprando
          </button>
        </div>
      </section>
    );
  }

  // 2) Pedido confirmado, pendiente de pago
  if (pedido) {
    // Cuando el backend devuelve "corralones" (una sub-orden por corralón) se muestran separados.
    const corralones = pedido.corralones || [];
    return (
      <section className="carrito-pagina">
        <h2>Pedido #{pedido.id}</h2>
        <p className="mensaje-exito" role="status">
          ¡Pedido confirmado! Está pendiente de pago. Si no pagás ahora, lo encontrás en "Mis Pedidos".
        </p>

        {corralones.length > 0 ? (
          corralones.map((c, idx) => (
            <section className="cr-grupo" key={c.proveedor_id ?? idx}>
              <EncabezadoCorralon
                numero={idx + 1}
                nombre={c.proveedor_nombre || `Corralón #${c.proveedor_id}`}
                total={c.total}
                estado={c.estado}
              />
              <div className="cr-tabla-wrap">
                <table className="cr-tabla">
                  <thead>
                    <tr><th>Producto</th><th>Cantidad</th><th>Subtotal</th></tr>
                  </thead>
                  <tbody>
                    {c.items.map((i) => (
                      <tr key={i.producto_id}>
                        <td>{i.nombre}</td>
                        <td>{i.cantidad}</td>
                        <td>{dinero(i.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        ) : (
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
        )}

        <div className="carrito-resumen">
          <span className="carrito-total">Total: {dinero(pedido.total)}</span>
          <div className="carrito-acciones">
            {onVerPedidos && (
              <button type="button" className="btn-secundario" disabled={trabajando} onClick={onVerPedidos}>
                Pagar más tarde
              </button>
            )}
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

  // Carrito vacío
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

  // 1) Carrito agrupado por corralón
  const grupos = agruparPorCorralon(items);

  return (
    <section className="carrito-pagina">
      <h2>Carrito</h2>
      {grupos.length > 1 && (
        <p className="cr-sub">
          Tu compra es de {grupos.length} corralones. Cada uno prepara y envía su parte por separado.
        </p>
      )}

      {grupos.map((g, idx) => (
        <section className="cr-grupo" key={g.clave}>
          <EncabezadoCorralon numero={idx + 1} nombre={g.nombre} total={g.subtotal} />
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
                {g.items.map((i) => (
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
        </section>
      ))}

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
import { Fragment, useEffect, useState } from "react";
import {
  crearOrdenCompra,
  crearProveedorInsumo,
  obtenerOrdenesCompra,
  obtenerProductos,
  obtenerProveedoresInsumo,
  recibirOrdenCompra,
} from "../../api.js";
import "./CorralonPedidos.css";
import "./CorralonCompras.css";

// "clase" reutiliza los colores de .cr-estado (ok = verde, bajo = ámbar).
const ESTADOS_ORDEN = {
  pendiente: { texto: "Pendiente", clase: "bajo" },
  recibida: { texto: "Recibida", clase: "ok" },
};

const fecha = (iso) => new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
const limpiar = (msg) => String(msg).replace(/^"|"$/g, "");
const lineaVacia = () => ({ productoId: "", cantidad: "10" });

// Compras del corralón: sus proveedores de insumos y las órdenes de compra que les hace.
// Al recibir una orden, la API suma las cantidades al stock.
// productoInicial viene del atajo "Pedir al proveedor" de la pantalla Stock.
export default function CorralonCompras({ usuario, productoInicial }) {
  const [pestana, setPestana] = useState("ordenes");
  const [proveedores, setProveedores] = useState(null); // null = cargando
  const [ordenes, setOrdenes] = useState(null);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [aviso, setAviso] = useState({ tipo: "", texto: "" });
  const [trabajando, setTrabajando] = useState(false);
  const [abierta, setAbierta] = useState(null); // id de la orden con el detalle desplegado

  const [formProveedor, setFormProveedor] = useState({ nombre: "", telefono: "", email: "" });
  const [formOrden, setFormOrden] = useState(() =>
    productoInicial
      ? { proveedorId: "", lineas: [{ productoId: String(productoInicial.id), cantidad: "20" }] }
      : null
  );

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      obtenerProveedoresInsumo({ corralonId: usuario.id }),
      obtenerOrdenesCompra({ corralonId: usuario.id }),
      obtenerProductos({ proveedorId: usuario.id }),
    ])
      .then(([provs, ords, prods]) => {
        if (cancelado) return;
        setProveedores(provs);
        setOrdenes(ords);
        setProductos(prods.filter((p) => p.activo));
        setError(false);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error("No se pudieron cargar las compras:", err);
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

  // ---------- Proveedores ----------
  const guardarProveedor = () =>
    ejecutar(async () => {
      const nombre = formProveedor.nombre.trim();
      if (!nombre) throw new Error("Escribí el nombre del proveedor.");
      await crearProveedorInsumo({
        corralonId: usuario.id,
        nombre,
        telefono: formProveedor.telefono.trim(),
        email: formProveedor.email.trim(),
      });
      setFormProveedor({ nombre: "", telefono: "", email: "" });
      setAviso({ tipo: "ok", texto: `Proveedor "${nombre}" agregado.` });
      setRecarga((n) => n + 1);
    });

  // ---------- Órdenes de compra ----------
  function abrirFormOrden() {
    setAviso({ tipo: "", texto: "" });
    setFormOrden({ proveedorId: "", lineas: [lineaVacia()] });
  }

  function cambiarLinea(indice, campo, valor) {
    setFormOrden((f) => ({
      ...f,
      lineas: f.lineas.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)),
    }));
  }

  const agregarLinea = () => setFormOrden((f) => ({ ...f, lineas: [...f.lineas, lineaVacia()] }));

  const quitarLinea = (indice) =>
    setFormOrden((f) => ({ ...f, lineas: f.lineas.filter((_, i) => i !== indice) }));

  const guardarOrden = () =>
    ejecutar(async () => {
      if (!formOrden.proveedorId) throw new Error("Elegí un proveedor.");
      const items = formOrden.lineas.map((l) => ({
        producto_id: Number(l.productoId),
        cantidad: Number(l.cantidad),
      }));
      if (items.some((i) => !i.producto_id)) throw new Error("Elegí un producto en cada línea.");
      if (items.some((i) => !Number.isInteger(i.cantidad) || i.cantidad < 1)) {
        throw new Error("La cantidad tiene que ser un número entero mayor a 0.");
      }
      if (new Set(items.map((i) => i.producto_id)).size !== items.length) {
        throw new Error("Hay un producto repetido: sumá las cantidades en una sola línea.");
      }
      await crearOrdenCompra({
        corralonId: usuario.id,
        proveedorInsumoId: Number(formOrden.proveedorId),
        items,
      });
      setFormOrden(null);
      setAviso({ tipo: "ok", texto: "Orden de compra creada. El stock sube cuando la marques como recibida." });
      setRecarga((n) => n + 1);
    });

  function recibir(orden) {
    const seguro = window.confirm(
      `¿Marcar la orden #${orden.id} como recibida? Se suman las cantidades al stock y no se puede deshacer.`
    );
    if (!seguro) return;
    ejecutar(async () => {
      await recibirOrdenCompra({ ordenId: orden.id, usuarioId: usuario.id });
      setAviso({ tipo: "ok", texto: `Orden #${orden.id} recibida: el stock se actualizó.` });
      setRecarga((n) => n + 1);
    });
  }

  // ---------- Pantallas ----------
  function formularioOrden() {
    if (!formOrden) return null;
    if (proveedores !== null && proveedores.length === 0) {
      return (
        <p className="cc-aviso-vacio">
          Para crear una orden primero cargá un proveedor en la pestaña "Proveedores".
        </p>
      );
    }
    return (
      <div className="cc-formulario">
        <h3>Nueva orden de compra</h3>
        <div className="cc-campos">
          <label className="cc-campo">
            Proveedor
            <select
              value={formOrden.proveedorId}
              onChange={(e) => setFormOrden((f) => ({ ...f, proveedorId: e.target.value }))}
            >
              <option value="">Elegí un proveedor</option>
              {(proveedores ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        {formOrden.lineas.map((l, i) => (
          <div className="cc-linea" key={i}>
            <select
              value={l.productoId}
              onChange={(e) => cambiarLinea(i, "productoId", e.target.value)}
              aria-label="Producto"
            >
              <option value="">Elegí un producto</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} (stock {p.stock})
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              step="1"
              value={l.cantidad}
              onChange={(e) => cambiarLinea(i, "cantidad", e.target.value)}
              aria-label="Cantidad"
            />
            <button
              type="button"
              className="cr-btn-icono peligro"
              disabled={formOrden.lineas.length === 1}
              onClick={() => quitarLinea(i)}
              aria-label="Quitar línea"
            >
              🗑
            </button>
          </div>
        ))}

        <div className="cc-formulario-acciones">
          <button type="button" className="btn-secundario" onClick={agregarLinea}>
            + Agregar producto
          </button>
          <button type="button" className="btn-secundario" disabled={trabajando} onClick={() => setFormOrden(null)}>
            Cancelar
          </button>
          <button type="button" className="btn-tan" disabled={trabajando} onClick={guardarOrden}>
            {trabajando ? "Guardando..." : "Crear orden"}
          </button>
        </div>
      </div>
    );
  }

  function tablaOrdenes() {
    if (error) {
      return (
        <tr>
          <td colSpan="5" className="cr-vacio">No se pudo conectar con el servidor.</td>
        </tr>
      );
    }
    if (ordenes === null) return null;
    if (ordenes.length === 0) {
      return (
        <tr>
          <td colSpan="5" className="cr-vacio">Todavía no hiciste órdenes de compra.</td>
        </tr>
      );
    }
    return ordenes.map((o) => {
      const estado = ESTADOS_ORDEN[o.estado] ?? { texto: o.estado, clase: "" };
      const desplegada = abierta === o.id;
      return (
        <Fragment key={o.id}>
          <tr>
            <td>#{o.id}</td>
            <td>{fecha(o.creado_en)}</td>
            <td>{o.proveedor.nombre}</td>
            <td className={`cr-estado ${estado.clase}`}>{estado.texto}</td>
            <td className="cr-acciones">
              <button
                type="button"
                className="cr-btn-icono"
                aria-expanded={desplegada}
                onClick={() => setAbierta(desplegada ? null : o.id)}
              >
                {desplegada ? "Ocultar" : "Ver detalle"}
              </button>
              {o.estado === "pendiente" && (
                <button type="button" className="cr-btn-icono" disabled={trabajando} onClick={() => recibir(o)}>
                  Marcar recibida
                </button>
              )}
            </td>
          </tr>
          {desplegada && (
            <tr className="cr-pedido-detalle">
              <td colSpan="5">
                <table className="cr-pedido-items">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad pedida</th>
                      <th>Stock actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.items.map((item) => (
                      <tr key={item.producto_id}>
                        <td>{item.nombre}</td>
                        <td>{item.cantidad}</td>
                        <td>{item.stock_actual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {o.recibida_en && <p className="cr-sub">Recibida el {fecha(o.recibida_en)}.</p>}
              </td>
            </tr>
          )}
        </Fragment>
      );
    });
  }

  function tablaProveedores() {
    if (error) {
      return (
        <tr>
          <td colSpan="3" className="cr-vacio">No se pudo conectar con el servidor.</td>
        </tr>
      );
    }
    if (proveedores === null) return null;
    if (proveedores.length === 0) {
      return (
        <tr>
          <td colSpan="3" className="cr-vacio">Todavía no cargaste proveedores.</td>
        </tr>
      );
    }
    return proveedores.map((p) => (
      <tr key={p.id}>
        <td>{p.nombre}</td>
        <td>{p.telefono || "—"}</td>
        <td>{p.email || "—"}</td>
      </tr>
    ));
  }

  return (
    <section className="cr-pagina">
      <div className="cr-cabecera">
        <div>
          <h2>Compras</h2>
          <p className="cr-sub">Tus proveedores de insumos y las órdenes de compra para reponer stock.</p>
        </div>
        <button type="button" className="cr-btn-icono" onClick={() => setRecarga((n) => n + 1)}>
          ↻ Actualizar
        </button>
      </div>

      <div className="cr-pills">
        <button
          type="button"
          className={pestana === "ordenes" ? "cr-pill activo" : "cr-pill"}
          onClick={() => setPestana("ordenes")}
        >
          Órdenes de compra ({(ordenes ?? []).length})
        </button>
        <button
          type="button"
          className={pestana === "proveedores" ? "cr-pill activo" : "cr-pill"}
          onClick={() => setPestana("proveedores")}
        >
          Proveedores ({(proveedores ?? []).length})
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

      {(ordenes === null || proveedores === null) && !error && (
        <>
          <div className="cr-esqueleto" />
          <div className="cr-esqueleto" />
        </>
      )}

      {pestana === "ordenes" && (
        <>
          {formOrden ? (
            formularioOrden()
          ) : (
            <div className="cc-formulario-acciones">
              <button type="button" className="btn-tan" onClick={abrirFormOrden}>
                + Nueva orden de compra
              </button>
            </div>
          )}
          <div className="cr-tabla-wrap">
            <table className="cr-tabla">
              <thead>
                <tr>
                  <th>N° Orden</th>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>{tablaOrdenes()}</tbody>
            </table>
          </div>
        </>
      )}

      {pestana === "proveedores" && (
        <>
          <div className="cc-formulario">
            <h3>Agregar proveedor</h3>
            <div className="cc-campos">
              <label className="cc-campo">
                Nombre
                <input
                  type="text"
                  value={formProveedor.nombre}
                  maxLength={100}
                  onChange={(e) => setFormProveedor((f) => ({ ...f, nombre: e.target.value }))}
                />
              </label>
              <label className="cc-campo">
                Teléfono
                <input
                  type="text"
                  value={formProveedor.telefono}
                  maxLength={50}
                  onChange={(e) => setFormProveedor((f) => ({ ...f, telefono: e.target.value }))}
                />
              </label>
              <label className="cc-campo">
                Email
                <input
                  type="email"
                  value={formProveedor.email}
                  maxLength={255}
                  onChange={(e) => setFormProveedor((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
            </div>
            <div className="cc-formulario-acciones">
              <button type="button" className="btn-tan" disabled={trabajando} onClick={guardarProveedor}>
                {trabajando ? "Guardando..." : "Agregar proveedor"}
              </button>
            </div>
          </div>

          <div className="cr-tabla-wrap">
            <table className="cr-tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>{tablaProveedores()}</tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { cambiarEstadoCorralon, obtenerPedidos } from "../../api.js";
import "./CorralonPedidos.css";

// Filtros por el estado de la parte de este corralón.
const FILTROS = [
  { id: "todos", etiqueta: "Todos" },
  { id: "pendiente", etiqueta: "Pendientes" },
  { id: "confirmado", etiqueta: "Confirmados" },
  { id: "enviado", etiqueta: "Enviados" },
  { id: "entregado", etiqueta: "Entregados" },
  { id: "devuelto", etiqueta: "Devueltos" },
  { id: "cancelado", etiqueta: "Cancelados" },
];

// "clase" reutiliza los colores de .cr-estado (ok = verde, bajo = ámbar, agotado = rojo).
const ESTADOS = {
  pendiente: { texto: "Pendiente", clase: "bajo" },
  confirmado: { texto: "Confirmado", clase: "ok" },
  enviado: { texto: "Enviado", clase: "ok" },
  entregado: { texto: "Entregado", clase: "ok" },
  devuelto: { texto: "Devuelto", clase: "agotado" },
  cancelado: { texto: "Cancelado", clase: "agotado" },
};

// Botón que corresponde a cada estado: avanza un paso.
const SIGUIENTE = {
  pendiente: { estado: "confirmado", texto: "Confirmar pedido" },
  confirmado: { estado: "enviado", texto: "Marcar como enviado" },
  enviado: { estado: "entregado", texto: "Marcar como entregado" },
};

const dinero = (n) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const fecha = (iso) => new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
const limpiar = (msg) => String(msg).replace(/^"|"$/g, "");

// La API devuelve en "corralones" solo la parte de este corralón.
function parteDe(pedido, corralonId) {
  return pedido.corralones.find((c) => c.proveedor_id === corralonId) ?? pedido.corralones[0];
}

// Si el pedido todavía no se pagó, el corralón no puede confirmarlo.
function estadoVisible(pedido, parte) {
  if (parte.estado === "pendiente" && pedido.estado === "pendiente") {
    return { texto: "Esperando pago", clase: "bajo" };
  }
  return ESTADOS[parte.estado] ?? { texto: parte.estado, clase: "" };
}

// Pedidos que incluyen productos de este corralón. Cada uno muestra solo sus items,
// el estado de su parte y los botones para avanzarla.
export default function CorralonPedidos({ usuario }) {
  const [pedidos, setPedidos] = useState(null); // null = cargando
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [filtro, setFiltro] = useState("todos");
  const [buscar, setBuscar] = useState("");
  const [seleccionado, setSeleccionado] = useState(null); // id del pedido abierto en el modal
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState({ tipo: "", texto: "" });

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

  // Esc cierra el modal
  useEffect(() => {
    if (seleccionado === null) return;
    const cerrarConEsc = (e) => {
      if (e.key === "Escape") setSeleccionado(null);
    };
    window.addEventListener("keydown", cerrarConEsc);
    return () => window.removeEventListener("keydown", cerrarConEsc);
  }, [seleccionado]);

  const filas = (pedidos ?? []).map((p) => ({ pedido: p, parte: parteDe(p, usuario.id) }));
  const cantidad = (id) =>
    id === "todos" ? filas.length : filas.filter((f) => f.parte.estado === id).length;
  const texto = buscar.trim().toLowerCase();
  const filtradas = filas.filter(
    (f) =>
      (filtro === "todos" || f.parte.estado === filtro) &&
      (!texto || String(f.pedido.id).includes(texto) || f.pedido.cliente.nombre.toLowerCase().includes(texto))
  );

  function abrirModal(id) {
    setAviso({ tipo: "", texto: "" });
    setSeleccionado(id);
  }

  async function avanzar(pedido, siguiente) {
    setTrabajando(true);
    setAviso({ tipo: "", texto: "" });
    try {
      await cambiarEstadoCorralon({
        pedidoId: pedido.id,
        proveedorId: usuario.id,
        usuarioId: usuario.id,
        estado: siguiente.estado,
      });
      setAviso({
        tipo: "ok",
        texto: `Pedido #${pedido.id}: ${ESTADOS[siguiente.estado].texto.toLowerCase()}.`,
      });
      setRecarga((n) => n + 1);
    } catch (err) {
      setAviso({ tipo: "error", texto: limpiar(err.message) });
    } finally {
      setTrabajando(false);
    }
  }

  const avisoJsx = aviso.texto && (
    <p
      className={aviso.tipo === "ok" ? "mensaje-exito" : "error-campo"}
      role={aviso.tipo === "ok" ? "status" : "alert"}
    >
      {aviso.texto}
    </p>
  );

  function cuerpoTabla() {
    if (error) {
      return (
        <tr>
          <td colSpan="6" className="cr-vacio">No se pudo conectar con el servidor.</td>
        </tr>
      );
    }
    if (pedidos === null) return null;
    if (filtradas.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="cr-vacio">
            {filas.length === 0 ? "Todavía no recibiste pedidos." : "No hay pedidos con ese filtro."}
          </td>
        </tr>
      );
    }
    return filtradas.map(({ pedido: p, parte }) => {
      const estado = estadoVisible(p, parte);
      return (
        <tr key={p.id}>
          <td>#{p.id}</td>
          <td>{fecha(p.creado_en)}</td>
          <td>{p.cliente.nombre}</td>
          <td>{dinero(parte.total)}</td>
          <td className={`cr-estado ${estado.clase}`}>{estado.texto}</td>
          <td className="cr-acciones">
            <button type="button" className="cr-btn-icono" onClick={() => abrirModal(p.id)}>
              Ver detalle
            </button>
          </td>
        </tr>
      );
    });
  }

  function modal() {
    const fila = filas.find((f) => f.pedido.id === seleccionado);
    if (!fila) return null;
    const { pedido: p, parte } = fila;
    const estado = estadoVisible(p, parte);
    const siguiente = SIGUIENTE[parte.estado];
    const puedeAvanzar = siguiente && p.estado === "pagado";

    return (
      <div
        className="cp-modal-fondo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cp-titulo"
        onClick={() => setSeleccionado(null)}
      >
        <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
          <div className="cp-modal-cabecera">
            <h3 id="cp-titulo">Pedido #{p.id}</h3>
            <span className={`cr-estado ${estado.clase}`}>{estado.texto}</span>
          </div>
          <p className="cp-modal-datos">
            Cliente: {p.cliente.nombre} · {fecha(p.creado_en)}
          </p>

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
              {parte.items.map((item) => (
                <tr key={item.producto_id}>
                  <td>{item.nombre}</td>
                  <td>{item.cantidad}</td>
                  <td>{dinero(item.precio_unitario)}</td>
                  <td>{dinero(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cp-modal-total">Total: {dinero(parte.total)}</p>

          {parte.estado === "devuelto" && (
            <p className="cp-modal-motivo">
              El cliente reportó un problema: {parte.motivo_devolucion}
              <br />
              El stock no se repone solo: revisá el material y ajustalo en Stock si corresponde.
            </p>
          )}

          {parte.estado === "pendiente" && p.estado === "pendiente" && (
            <p className="cp-modal-espera">
              El cliente todavía no pagó este pedido. Cuando pague vas a poder confirmarlo.
            </p>
          )}

          {avisoJsx}

          <div className="cp-modal-acciones">
            <button type="button" className="btn-secundario" onClick={() => setSeleccionado(null)}>
              Cerrar
            </button>
            {puedeAvanzar && (
              <button
                type="button"
                className="btn-tan"
                disabled={trabajando}
                onClick={() => avanzar(p, siguiente)}
              >
                {trabajando ? "Guardando..." : siguiente.texto}
              </button>
            )}
          </div>
        </div>
      </div>
    );
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

      <div className="filtros">
        <input
          type="text"
          placeholder="Buscar por N° de pedido o cliente..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          aria-label="Buscar pedidos"
        />
      </div>

      {seleccionado === null && avisoJsx}

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

      {seleccionado !== null && modal()}
    </section>
  );
}

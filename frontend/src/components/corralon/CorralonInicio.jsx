import { useEffect, useState } from "react";
import useProductosCorralon, { STOCK_MINIMO } from "./useProductosCorralon.js";
import { obtenerResumenCorralon } from "../../apiResumen.js";
import ErrorServidor from "./ErrorServidor.jsx";

const ACCESOS = [
  { id: "productos", titulo: "Subir productos", texto: "Agregá nuevos productos a tu catálogo." },
  { id: "productos", titulo: "Ver productos", texto: "Editá o eliminá productos existentes." },
  { id: "stock", titulo: "Gestionar stock", texto: "Actualizá cantidades y controlá faltantes." },
  { id: "pedidos", titulo: "Ver pedidos", texto: "Revisá los pedidos recibidos." },
];

// Estados de la parte del corralón en pedidos pagados.
const ESTADOS = {
  pendiente: { texto: "Pendiente", clase: "bajo" },
  confirmado: { texto: "Confirmado", clase: "ok" },
  enviado: { texto: "Enviado", clase: "ok" },
  entregado: { texto: "Entregado", clase: "ok" },
  devuelto: { texto: "Devuelto", clase: "agotado" },
  cancelado: { texto: "Cancelado", clase: "agotado" },
};

const dinero = (n) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });

export default function CorralonInicio({ usuario, onIr }) {
  const { productos, error } = useProductosCorralon(usuario.id);
  const [resumen, setResumen] = useState(null); // null = cargando
  const [errorResumen, setErrorResumen] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setErrorResumen(false);
    obtenerResumenCorralon(usuario.id, { stockMinimo: STOCK_MINIMO, masVendidos: 5 })
      .then((datos) => {
        if (!cancelado) setResumen(datos);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error("No se pudo cargar el resumen del corralón:", err);
        setErrorResumen(true);
      });
    return () => {
      cancelado = true;
    };
  }, [usuario.id, recarga]);

  const cargando = resumen === null && !errorResumen;
  const estados = Object.entries(resumen?.pedidos_por_estado ?? {});

  return (
    <section className="cr-pagina">
      <div className="cr-cabecera">
        <div>
          <h2>Hola, {usuario.nombre} 👋</h2>
          <p className="cr-sub">Gestioná tus productos, stock y pedidos.</p>
        </div>
        <button type="button" className="cr-btn-icono" onClick={() => setRecarga((n) => n + 1)}>
          ↻ Actualizar
        </button>
      </div>
      {(error || errorResumen) && (
  <p className="mensaje">
    <ErrorServidor onReintentar={() => setRecarga((n) => n + 1)} />
  </p>
)}

      <div className="cr-kpis">
        <div className="cr-kpi">
          <div className="cr-kpi-num">{resumen ? dinero(resumen.ventas_mes) : "—"}</div>
          <p className="cr-kpi-txt">Ventas del mes</p>
          {resumen && <p className="cr-kpi-nota">{resumen.pedidos_mes} pedidos pagados</p>}
        </div>
        <div className="cr-kpi">
          <div className="cr-kpi-num">{resumen?.pedidos_pendientes ?? "—"}</div>
          <p className="cr-kpi-txt">Pedidos pendientes</p>
          <p className="cr-kpi-nota">Pagados que todavía no entregaste</p>
        </div>
        <div className="cr-kpi">
          <div className="cr-kpi-num">{productos?.length ?? "—"}</div>
          <p className="cr-kpi-txt">Productos publicados</p>
        </div>
        <div className="cr-kpi alerta">
          <div className="cr-kpi-num">{resumen ? resumen.stock_bajo.length : "—"}</div>
          <p className="cr-kpi-txt">Con stock bajo</p>
          <p className="cr-kpi-nota">Umbral: {STOCK_MINIMO} unidades</p>
        </div>
      </div>

      {cargando && (
        <>
          <div className="cr-esqueleto" />
          <div className="cr-esqueleto" />
        </>
      )}

      {resumen && (
        <>
          {estados.length > 0 && (
            <>
              <h3 className="cr-subtitulo">Pedidos por estado</h3>
              <div className="cr-resumen-estados">
                {estados.map(([estado, cantidad]) => {
                  const est = ESTADOS[estado] ?? { texto: estado, clase: "" };
                  return (
                    <span key={estado} className={`cr-estado ${est.clase}`}>
                      {est.texto}: {cantidad}
                    </span>
                  );
                })}
              </div>
            </>
          )}

          <div className="cr-resumen-grid">
            <div>
              <h3 className="cr-subtitulo">Más vendidos del mes</h3>
              <div className="cr-tabla-wrap">
                <table className="cr-tabla">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.mas_vendidos.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="cr-vacio">Todavía no hay ventas este mes.</td>
                      </tr>
                    ) : (
                      resumen.mas_vendidos.map((p) => (
                        <tr key={p.producto_id}>
                          <td>{p.nombre}</td>
                          <td>{p.cantidad}</td>
                          <td>{dinero(p.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="cr-subtitulo">Stock bajo</h3>
              <div className="cr-tabla-wrap">
                <table className="cr-tabla">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.stock_bajo.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="cr-vacio">Ningún producto con stock bajo.</td>
                      </tr>
                    ) : (
                      resumen.stock_bajo.map((p) => (
                        <tr key={p.producto_id}>
                          <td>{p.nombre}</td>
                          <td className={`cr-estado ${p.stock === 0 ? "agotado" : "bajo"}`}>
                            {p.stock === 0 ? "Sin stock" : p.stock}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      <h3 className="cr-subtitulo">Accesos rápidos</h3>
      <div className="cr-accesos">
        {ACCESOS.map((a) => (
          <button key={a.titulo} type="button" className="cr-acceso" onClick={() => onIr(a.id)}>
            <strong>{a.titulo}</strong><span>{a.texto}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

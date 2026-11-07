import { useEffect, useState } from "react";
import { obtenerEstadisticas } from "../../apiCorralon.js";

const AZUL = "#162039";
const ARENA = "#c9a27a";

const METODOS = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta_credito: "Tarjeta de crédito",
  otros: "Otros",
};

const dinero = (n) => Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const etiquetaMes = (mes) =>
  new Date(`${mes}-01T12:00:00`).toLocaleDateString("es-AR", { month: "short", year: "2-digit" });

export default function CorralonEstadisticas({ usuario }) {
  const [meses, setMeses] = useState(6);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;
    setError(null);
    obtenerEstadisticas(usuario.id, usuario.id, meses)
      .then((d) => vivo && setDatos(d))
      .catch((e) => vivo && setError(e.message));
    return () => {
      vivo = false;
    };
  }, [usuario.id, meses]);

  const maxMes = Math.max(1, ...(datos?.por_mes ?? []).map((m) => m.monto));

  return (
    <div>
      <div className="cr-cabecera">
        <h3 className="cr-subtitulo">Estadísticas de venta</h3>
        <label>
          Período:{" "}
          <select value={meses} onChange={(e) => setMeses(Number(e.target.value))}>
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Últimos 12 meses</option>
          </select>
        </label>
      </div>

      {error && <p style={{ color: "#a33" }}>No se pudieron cargar las estadísticas: {error}</p>}
      {!datos && !error && <p>Cargando…</p>}

      {datos && (
        <>
          <div className="cr-kpis">
            <div className="cr-kpi">
              <div className="cr-kpi-num">{dinero(datos.ventas_total)}</div>
              <p className="cr-kpi-txt">Ventas del período</p>
            </div>
            <div className="cr-kpi">
              <div className="cr-kpi-num">{datos.pedidos_total}</div>
              <p className="cr-kpi-txt">Pedidos pagados</p>
            </div>
            <div className="cr-kpi">
              <div className="cr-kpi-num">{dinero(datos.ticket_promedio)}</div>
              <p className="cr-kpi-txt">Ticket promedio</p>
            </div>
          </div>

          {datos.pedidos_total === 0 ? (
            <p className="cr-vacio">Todavía no hay ventas en este período.</p>
          ) : (
            <div className="cr-resumen-grid">
              <div>
                <h4 style={{ color: AZUL }}>Ventas por método de pago</h4>
                {datos.por_metodo.map((m) => (
                  <div key={m.metodo} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                      <strong>{METODOS[m.metodo] ?? m.metodo}</strong>
                      <span>
                        {m.cantidad} pedidos · {dinero(m.monto)} · {m.porcentaje}%
                      </span>
                    </div>
                    <div style={{ background: "#eee", borderRadius: 6, height: 12, marginTop: 4 }}>
                      <div
                        style={{
                          width: `${m.porcentaje}%`,
                          background: AZUL,
                          height: "100%",
                          borderRadius: 6,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h4 style={{ color: AZUL }}>Ventas por mes</h4>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  {datos.por_mes.map((m) => (
                    <div key={m.mes} style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
                      <div style={{ height: 140, display: "flex", alignItems: "flex-end" }}>
                        <div
                          title={`${dinero(m.monto)} · ${m.cantidad} pedidos`}
                          style={{
                            width: "100%",
                            height: `${Math.max((m.monto / maxMes) * 100, m.monto > 0 ? 3 : 0)}%`,
                            background: ARENA,
                            borderRadius: "6px 6px 0 0",
                          }}
                        />
                      </div>
                      <small>{etiquetaMes(m.mes)}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

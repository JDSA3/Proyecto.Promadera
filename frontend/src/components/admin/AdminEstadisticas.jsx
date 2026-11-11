import { useMemo, useState } from "react";

const AZUL = "#162039";
const ARENA = "#c9a27a";
const GRIS = "#667";

const peso = (n) =>
  `$ ${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

// Versión corta para los ejes: $ 1,2 M / $ 45 mil / $ 800
const corto = (n) => {
  if (n >= 1e6) return `$ ${(n / 1e6).toFixed(1).replace(".", ",")} M`;
  if (n >= 1e3) return `$ ${Math.round(n / 1e3)} mil`;
  return `$ ${Math.round(n)}`;
};

// Las partes de un corralón canceladas o devueltas no cuentan como venta.
const EXCLUIDOS = ["cancelado", "devuelto"];

function claveDe(iso, agrupar) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return agrupar === "mes" ? `${y}-${m}` : `${y}-${m}-${dd}`;
}

function etiquetaDe(clave) {
  const [y, m, d] = clave.split("-");
  return d ? `${d}/${m}` : `${m}/${y}`;
}

// Una fila por cada parte de corralón de un pedido pagado.
function filasDeVentas(pedidos) {
  const filas = [];
  for (const p of pedidos) {
    if (p.estado !== "pagado") continue;
    for (const c of p.corralones ?? []) {
      if (EXCLUIDOS.includes(c.estado)) continue;
      filas.push({
        pedidoId: p.id,
        fecha: p.creado_en,
        proveedorId: c.proveedor_id,
        nombre: c.proveedor_nombre || `Corralón #${c.proveedor_id}`,
        total: Number(c.total || 0),
      });
    }
  }
  return filas;
}

const W = 620;
const H = 280;
const M = { t: 20, r: 16, b: 38, l: 64 };
const PW = W - M.l - M.r;
const PH = H - M.t - M.b;

function Cuadricula({ max }) {
  return [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const y = M.t + PH - f * PH;
    return (
      <g key={f}>
        <line x1={M.l} x2={W - M.r} y1={y} y2={y} stroke="#e5ded3" />
        <text x={M.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill={GRIS}>
          {corto(max * f)}
        </text>
      </g>
    );
  });
}

function Etiquetas({ datos, x }) {
  const salto = Math.ceil(datos.length / 10);
  return datos.map((d, i) =>
    i % salto === 0 ? (
      <text key={d.etiqueta} x={x(i)} y={H - 14} textAnchor="middle" fontSize="11" fill={GRIS}>
        {d.etiqueta}
      </text>
    ) : null
  );
}

function GraficoBarras({ datos }) {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  const paso = PW / datos.length;
  const ancho = Math.min(paso * 0.6, 60);
  const x = (i) => M.l + paso * i + paso / 2;
  const y = (v) => M.t + PH - (v / max) * PH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Ventas por período, en barras">
      <Cuadricula max={max} />
      {datos.map((d, i) => (
        <g key={d.etiqueta}>
          <rect
            x={x(i) - ancho / 2}
            y={y(d.valor)}
            width={ancho}
            height={M.t + PH - y(d.valor)}
            rx="3"
            fill={AZUL}
          >
            <title>{`${d.etiqueta}: ${peso(d.valor)}`}</title>
          </rect>
          {datos.length <= 8 && (
            <text x={x(i)} y={y(d.valor) - 6} textAnchor="middle" fontSize="11" fill={AZUL}>
              {corto(d.valor)}
            </text>
          )}
        </g>
      ))}
      <Etiquetas datos={datos} x={x} />
    </svg>
  );
}

function GraficoCurva({ datos }) {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  const x = (i) => (datos.length === 1 ? M.l + PW / 2 : M.l + (i / (datos.length - 1)) * PW);
  const y = (v) => M.t + PH - (v / max) * PH;
  const linea = datos.map((d, i) => `${i ? "L" : "M"}${x(i)} ${y(d.valor)}`).join(" ");
  const area = `${linea} L${x(datos.length - 1)} ${M.t + PH} L${x(0)} ${M.t + PH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Ventas acumuladas, curva de crecimiento">
      <Cuadricula max={max} />
      {datos.length > 1 && <path d={area} fill={ARENA} opacity="0.25" />}
      {datos.length > 1 && <path d={linea} fill="none" stroke={ARENA} strokeWidth="3" />}
      {datos.map((d, i) => (
        <circle key={d.etiqueta} cx={x(i)} cy={y(d.valor)} r="4.5" fill={AZUL}>
          <title>{`${d.etiqueta}: ${peso(d.valor)} acumulado`}</title>
        </circle>
      ))}
      <Etiquetas datos={datos} x={x} />
    </svg>
  );
}

function Tarjeta({ titulo, valor }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${ARENA}`,
        borderRadius: 12,
        padding: "14px 18px",
        minWidth: 150,
      }}
    >
      <div style={{ fontSize: 13, color: GRIS }}>{titulo}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: AZUL }}>{valor}</div>
    </div>
  );
}

function Panel({ titulo, children }) {
  return (
    <div
      style={{
        flex: "1 1 420px",
        minWidth: 0,
        background: "#fff",
        border: `1px solid ${ARENA}`,
        borderRadius: 12,
        padding: "12px 16px",
      }}
    >
      <h4 style={{ margin: "0 0 8px", color: AZUL }}>{titulo}</h4>
      {children}
    </div>
  );
}

// Estadísticas de ventas de los corralones: en general o de uno en particular.
// Recibe la lista de pedidos que ya carga el panel (con sus corralones).
export default function EstadisticasVentas({ pedidos }) {
  const [corralon, setCorralon] = useState("todos");
  const [agrupar, setAgrupar] = useState("dia");

  const ventas = useMemo(() => filasDeVentas(pedidos), [pedidos]);

  const corralones = useMemo(() => {
    const mapa = new Map();
    for (const p of pedidos) {
      for (const c of p.corralones ?? []) {
        mapa.set(c.proveedor_id, c.proveedor_nombre || `Corralón #${c.proveedor_id}`);
      }
    }
    return [...mapa].sort((a, b) => a[1].localeCompare(b[1]));
  }, [pedidos]);

  const filtradas = useMemo(
    () => (corralon === "todos" ? ventas : ventas.filter((v) => String(v.proveedorId) === corralon)),
    [ventas, corralon]
  );

  const serie = useMemo(() => {
    const porClave = new Map();
    for (const v of filtradas) {
      const k = claveDe(v.fecha, agrupar);
      porClave.set(k, (porClave.get(k) || 0) + v.total);
    }
    return [...porClave]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, valor]) => ({ etiqueta: etiquetaDe(k), valor }));
  }, [filtradas, agrupar]);

  const acumulada = useMemo(() => {
    let suma = 0;
    return serie.map((p) => ({ etiqueta: p.etiqueta, valor: (suma += p.valor) }));
  }, [serie]);

  const ranking = useMemo(() => {
    const mapa = new Map();
    for (const v of ventas) {
      const actual = mapa.get(v.proveedorId) ?? { nombre: v.nombre, total: 0 };
      actual.total += v.total;
      mapa.set(v.proveedorId, actual);
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [ventas]);

  const total = filtradas.reduce((s, v) => s + v.total, 0);
  const cantidadPedidos = new Set(filtradas.map((v) => v.pedidoId)).size;
  const ticket = cantidadPedidos ? total / cantidadPedidos : 0;
  const maxRanking = Math.max(...ranking.map((r) => r.total), 1);

  const botonAgrupar = (valor, texto) => (
    <button
      type="button"
      onClick={() => setAgrupar(valor)}
      aria-pressed={agrupar === valor}
      style={{
        padding: "6px 12px",
        border: `1px solid ${AZUL}`,
        borderRadius: 8,
        cursor: "pointer",
        background: agrupar === valor ? AZUL : "#fff",
        color: agrupar === valor ? "#fff" : AZUL,
      }}
    >
      {texto}
    </button>
  );

  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{ color: AZUL }}>Estadísticas de ventas de corralones</h3>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <label style={{ color: AZUL }}>
          Corralón{" "}
          <select
            value={corralon}
            onChange={(e) => setCorralon(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${AZUL}` }}
          >
            <option value="todos">Todos los corralones</option>
            {corralones.map(([id, nombre]) => (
              <option key={id ?? "sin"} value={String(id)}>
                {nombre}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          {botonAgrupar("dia", "Por día")}
          {botonAgrupar("mes", "Por mes")}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Tarjeta titulo="Ventas (pedidos pagados)" valor={peso(total)} />
        <Tarjeta titulo="Pedidos" valor={cantidadPedidos} />
        <Tarjeta titulo="Ticket promedio" valor={peso(ticket)} />
      </div>

      {serie.length === 0 ? (
        <p>Todavía no hay ventas pagadas para mostrar.</p>
      ) : (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Panel titulo="Ventas por período (barras)">
            <GraficoBarras datos={serie} />
          </Panel>
          <Panel titulo="Ventas acumuladas (curva de crecimiento)">
            <GraficoCurva datos={acumulada} />
          </Panel>
        </div>
      )}

      {corralon === "todos" && ranking.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Panel titulo="Ventas por corralón">
            {ranking.map((r) => (
              <div key={r.nombre} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: AZUL }}>
                  <span>{r.nombre}</span>
                  <strong>{peso(r.total)}</strong>
                </div>
                <div style={{ background: "#efe8dd", borderRadius: 6, height: 12 }}>
                  <div
                    style={{
                      width: `${(r.total / maxRanking) * 100}%`,
                      height: "100%",
                      borderRadius: 6,
                      background: AZUL,
                    }}
                  />
                </div>
              </div>
            ))}
          </Panel>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from "react";
import {
  obtenerPedidos,
  obtenerProductos,
  obtenerUsuarios,
} from "../../api.js";

const AZUL = "#162039";
const ARENA = "#c9a27a";

const peso = (n) =>
  `$ ${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString("es-AR") : "-");

function useDatos(fn) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: true });
  useEffect(() => {
    let vivo = true;
    fn()
      .then((d) => vivo && setEstado({ datos: d, error: null, cargando: false }))
      .catch((e) => vivo && setEstado({ datos: null, error: e.message, cargando: false }));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return estado;
}

function Estado({ cargando, error, children }) {
  if (cargando) return <p>Cargando…</p>;
  if (error) return <p style={{ color: "#a33" }}>No se pudo cargar: {error}</p>;
  return children;
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
      <div style={{ fontSize: 13, color: "#667" }}>{titulo}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: AZUL }}>{valor}</div>
    </div>
  );
}

function Tabla({ columnas, filas }) {
  if (!filas.length) return <p>No hay datos para mostrar.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: AZUL, color: "#fff", textAlign: "left" }}>
            {columnas.map((c) => (
              <th key={c.titulo} style={{ padding: "8px 10px" }}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f.id ?? i} style={{ borderBottom: "1px solid #e5ded3" }}>
              {columnas.map((c) => (
                <td key={c.titulo} style={{ padding: "8px 10px" }}>
                  {c.render(f)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Resumen({ usuario }) {
  const pedidos = useDatos(obtenerPedidos);
  const productos = useDatos(obtenerProductos);
  const usuarios = useDatos(() => obtenerUsuarios(usuario.id));

  const cargando = pedidos.cargando || productos.cargando || usuarios.cargando;
  const error = pedidos.error || productos.error || usuarios.error;

  return (
    <Estado cargando={cargando} error={error}>
      {(() => {
        const lista = pedidos.datos ?? [];
        const pagados = lista.filter((p) => p.estado === "pagado");
        const ventas = pagados.reduce((s, p) => s + Number(p.total || 0), 0);
        const porEstado = lista.reduce((acc, p) => {
          acc[p.estado] = (acc[p.estado] || 0) + 1;
          return acc;
        }, {});
        return (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <Tarjeta titulo="Pedidos" valor={lista.length} />
              <Tarjeta titulo="Pedidos pagados" valor={pagados.length} />
              <Tarjeta titulo="Ventas (pagados)" valor={peso(ventas)} />
              <Tarjeta titulo="Usuarios" valor={(usuarios.datos ?? []).length} />
              <Tarjeta titulo="Productos" valor={(productos.datos ?? []).length} />
            </div>
            <h3 style={{ color: AZUL }}>Pedidos por estado</h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {Object.entries(porEstado).map(([e, n]) => (
                <Tarjeta key={e} titulo={e} valor={n} />
              ))}
            </div>
          </>
        );
      })()}
    </Estado>
  );
}

function Pedidos() {
  const { datos, error, cargando } = useDatos(obtenerPedidos);
  return (
    <Estado cargando={cargando} error={error}>
      <Tabla
        filas={datos ?? []}
        columnas={[
          { titulo: "N.º", render: (p) => p.id },
          { titulo: "Fecha", render: (p) => fecha(p.creado_en) },
          { titulo: "Cliente", render: (p) => p.cliente?.nombre ?? "-" },
          { titulo: "Entrega", render: (p) => p.entrega },
          { titulo: "Estado", render: (p) => p.estado },
          {
            titulo: "Corralones",
            render: (p) =>
              (p.corralones ?? [])
                .map((c) => `${c.proveedor_nombre ?? "-"}: ${c.estado}`)
                .join(" · ") || "-",
          },
          { titulo: "Total", render: (p) => peso(p.total) },
        ]}
      />
    </Estado>
  );
}

function Productos() {
  const { datos, error, cargando } = useDatos(obtenerProductos);
  return (
    <Estado cargando={cargando} error={error}>
      <Tabla
        filas={datos ?? []}
        columnas={[
          { titulo: "N.º", render: (p) => p.id },
          { titulo: "Producto", render: (p) => p.nombre ?? "-" },
          { titulo: "Precio", render: (p) => peso(p.precio) },
          { titulo: "Stock", render: (p) => p.stock ?? "-" },
        ]}
      />
    </Estado>
  );
}

function Usuarios({ usuario }) {
  const { datos, error, cargando } = useDatos(() => obtenerUsuarios(usuario.id));
  return (
    <Estado cargando={cargando} error={error}>
      <Tabla
        filas={datos ?? []}
        columnas={[
          { titulo: "N.º", render: (u) => u.id },
          { titulo: "Nombre", render: (u) => u.nombre },
          { titulo: "Email", render: (u) => u.email },
          { titulo: "Rol", render: (u) => u.rol },
          { titulo: "Activo", render: (u) => (u.activo ? "Sí" : "No") },
        ]}
      />
    </Estado>
  );
}

const TITULOS = {
  resumen: "Resumen",
  pedidos: "Pedidos",
  productos: "Productos",
  usuarios: "Usuarios",
};

export default function AdminPanel({ vista, usuario }) {
  const id = TITULOS[vista] ? vista : "resumen";
  return (
    <section style={{ padding: 16 }}>
      <h2 style={{ color: AZUL, marginTop: 0 }}>Panel de administrador · {TITULOS[id]}</h2>
      {id === "resumen" && <Resumen usuario={usuario} />}
      {id === "pedidos" && <Pedidos />}
      {id === "productos" && <Productos />}
      {id === "usuarios" && <Usuarios usuario={usuario} />}
    </section>
  );
}

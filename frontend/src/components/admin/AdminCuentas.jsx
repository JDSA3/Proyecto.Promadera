import { useCallback, useEffect, useState } from "react";
import {
  editarCarpintero,
  editarCorralonAdmin,
  listarCarpinteros,
  listarCorralonesAdmin,
} from "../../apiCorralon.js";

const AZUL = "#162039";
const ARENA = "#c9a27a";

const ESTADOS = { pendiente: "Sin aprobar", aprobado: "Aprobado", rechazado: "Rechazado" };

const campo = { display: "block", width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" };
const celda = { padding: "8px 10px", verticalAlign: "top" };

// tipo: "corralones" o "carpinteros"
export default function AdminCuentas({ usuario, tipo }) {
  const esCorralon = tipo === "corralones";
  const [estado, setEstado] = useState({ datos: [], error: null, cargando: true });
  const [buscar, setBuscar] = useState("");
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    const pedir = esCorralon ? listarCorralonesAdmin : listarCarpinteros;
    pedir(usuario.id)
      .then((d) => setEstado({ datos: d, error: null, cargando: false }))
      .catch((e) => setEstado({ datos: [], error: e.message, cargando: false }));
  }, [usuario.id, esCorralon]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async (cuenta) => {
    setGuardando(true);
    setError(null);
    try {
      const datos = {
        nombre: cuenta.nombre.trim(),
        email: cuenta.email.trim(),
        telefono: (cuenta.telefono || "").trim() || null,
        activo: cuenta.activo,
      };
      if (esCorralon) await editarCorralonAdmin(usuario.id, cuenta.id, datos);
      else await editarCarpintero(usuario.id, cuenta.id, datos);
      setEditando(null);
      cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = (cuenta) => {
    const accion = cuenta.activo ? "desactivar" : "activar";
    if (!window.confirm(`¿Querés ${accion} la cuenta de ${cuenta.nombre}?`)) return;
    guardar({ ...cuenta, activo: !cuenta.activo });
  };

  const texto = buscar.trim().toLowerCase();
  const filas = estado.datos.filter((c) =>
    [c.nombre, c.email, c.nombre_comercial, c.cuit, c.telefono]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(texto))
  );

  const columnas = esCorralon
    ? ["N.º", "Corralón", "Email", "Teléfono", "CUIT", "Dirección", "Productos", "Cuenta", "Activo", ""]
    : ["N.º", "Carpintero", "Email", "Teléfono", "Pedidos", "Activo", ""];

  return (
    <div>
      <input
        type="text"
        placeholder={esCorralon ? "Buscar por nombre, email o CUIT…" : "Buscar por nombre o email…"}
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        aria-label="Buscar cuentas"
        style={{ ...campo, maxWidth: 360, marginBottom: 12 }}
      />

      {error && <p style={{ color: "#a33" }}>{error}</p>}

      {editando && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            guardar(editando);
          }}
          style={{ background: "#fff", border: `1px solid ${ARENA}`, borderRadius: 12, padding: 16, marginBottom: 16 }}
        >
          <strong style={{ color: AZUL }}>Editar cuenta #{editando.id}</strong>
          <label>
            Nombre
            <input style={campo} value={editando.nombre} required maxLength={100}
              onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
          </label>
          <label>
            Email
            <input style={campo} type="email" value={editando.email} required maxLength={255}
              onChange={(e) => setEditando({ ...editando, email: e.target.value })} />
          </label>
          <label>
            Teléfono (solo números)
            <input style={campo} value={editando.telefono ?? ""} inputMode="numeric" maxLength={30}
              onChange={(e) => setEditando({ ...editando, telefono: e.target.value })} />
          </label>
          <label style={{ display: "block", marginTop: 8 }}>
            <input type="checkbox" checked={editando.activo}
              onChange={(e) => setEditando({ ...editando, activo: e.target.checked })} />{" "}
            Cuenta activa
          </label>
          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>{" "}
            <button type="button" disabled={guardando} onClick={() => { setEditando(null); setError(null); }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {estado.cargando && <p>Cargando…</p>}
      {estado.error && <p style={{ color: "#a33" }}>No se pudo cargar: {estado.error}</p>}
      {!estado.cargando && !estado.error && filas.length === 0 && <p>No hay cuentas para mostrar.</p>}

      {filas.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: AZUL, color: "#fff", textAlign: "left" }}>
                {columnas.map((t, i) => (
                  <th key={`${t}-${i}`} style={{ padding: "8px 10px" }}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #e5ded3" }}>
                  <td style={celda}>{c.id}</td>
                  <td style={celda}>
                    {c.nombre}
                    {esCorralon && c.nombre_comercial && c.nombre_comercial !== c.nombre && (
                      <>
                        <br />
                        <small>{c.nombre_comercial}</small>
                      </>
                    )}
                  </td>
                  <td style={celda}>{c.email}</td>
                  <td style={celda}>{c.telefono || "—"}</td>
                  {esCorralon ? (
                    <>
                      <td style={celda}>{c.cuit || "—"}</td>
                      <td style={celda}>{c.direccion || "—"}</td>
                      <td style={celda}>{c.cantidad_productos}</td>
                      <td style={celda}>{ESTADOS[c.estado] ?? c.estado}</td>
                    </>
                  ) : (
                    <td style={celda}>{c.cantidad_pedidos}</td>
                  )}
                  <td style={celda}>{c.activo ? "Sí" : "No"}</td>
                  <td style={{ ...celda, whiteSpace: "nowrap" }}>
                    <button type="button" onClick={() => { setError(null); setEditando({ ...c }); }}>
                      Editar
                    </button>{" "}
                    <button type="button" disabled={guardando} onClick={() => alternarActivo(c)}>
                      {c.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

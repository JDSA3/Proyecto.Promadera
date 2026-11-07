import { useCallback, useEffect, useState } from "react";
import {
  aprobarSolicitud,
  listarSolicitudes,
  rechazarSolicitud,
  urlArchivoSolicitud,
} from "../../apiCorralon.js";

const AZUL = "#162039";
const ESTADOS = { pendiente: "Pendiente", aprobada: "Aprobada", rechazada: "Rechazada" };
const TIPOS = { monotributo: "Monotributo", otro_arca: "Otro de ARCA" };

const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString("es-AR") : "-");

export default function AdminSolicitudes({ usuario }) {
  const [filtro, setFiltro] = useState("pendiente");
  const [estado, setEstado] = useState({ datos: [], error: null, cargando: true });
  const [trabajando, setTrabajando] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const cargar = useCallback(() => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    listarSolicitudes(usuario.id, filtro)
      .then((d) => setEstado({ datos: d, error: null, cargando: false }))
      .catch((e) => setEstado({ datos: [], error: e.message, cargando: false }));
  }, [usuario.id, filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const resolver = async (solicitud, accion) => {
    let motivo = null;

    if (accion === "aprobar") {
      if (!window.confirm(`¿Aprobar a ${solicitud.nombre_comercial}?`)) return;
    } else {
      motivo = window.prompt("Motivo del rechazo (el corralón lo va a ver):");
      if (!motivo || motivo.trim().length < 3) return;
    }

    setTrabajando(solicitud.id);
    setErrorAccion(null);
    try {
      if (accion === "aprobar") await aprobarSolicitud(usuario.id, solicitud.id);
      else await rechazarSolicitud(usuario.id, solicitud.id, motivo.trim());
      cargar();
    } catch (e) {
      setErrorAccion(e.message);
    } finally {
      setTrabajando(null);
    }
  };

  return (
    <div>
      <label>
        Mostrar:{" "}
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="pendiente">Pendientes</option>
          <option value="aprobada">Aprobadas</option>
          <option value="rechazada">Rechazadas</option>
          <option value="">Todas</option>
        </select>
      </label>

      {errorAccion && <p style={{ color: "#a33" }}>{errorAccion}</p>}
      {estado.cargando && <p>Cargando…</p>}
      {estado.error && <p style={{ color: "#a33" }}>No se pudo cargar: {estado.error}</p>}
      {!estado.cargando && !estado.error && estado.datos.length === 0 && <p>No hay solicitudes.</p>}

      {estado.datos.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: AZUL, color: "#fff", textAlign: "left" }}>
                {["Fecha", "Usuario", "Nombre comercial", "CUIT", "Teléfono", "Dirección", "Comprobante", "Estado", ""].map((t) => (
                  <th key={t} style={{ padding: "8px 10px" }}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {estado.datos.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #e5ded3", verticalAlign: "top" }}>
                  <td style={{ padding: "8px 10px" }}>{fecha(s.creado_en)}</td>
                  <td style={{ padding: "8px 10px" }}>
                    {s.usuario_nombre}
                    <br />
                    <small>{s.usuario_email}</small>
                  </td>
                  <td style={{ padding: "8px 10px" }}>{s.nombre_comercial}</td>
                  <td style={{ padding: "8px 10px" }}>{s.cuit}</td>
                  <td style={{ padding: "8px 10px" }}>{s.telefono}</td>
                  <td style={{ padding: "8px 10px" }}>{s.direccion}</td>
                  <td style={{ padding: "8px 10px" }}>
                    {TIPOS[s.tipo_comprobante] ?? s.tipo_comprobante}
                    <br />
                    <a href={urlArchivoSolicitud(s.id, usuario.id)} target="_blank" rel="noreferrer">
                      Ver archivo
                    </a>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    {ESTADOS[s.estado] ?? s.estado}
                    {s.estado === "rechazada" && s.motivo_rechazo && (
                      <>
                        <br />
                        <small>{s.motivo_rechazo}</small>
                      </>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                    {s.estado === "pendiente" && (
                      <>
                        <button disabled={trabajando === s.id} onClick={() => resolver(s, "aprobar")}>
                          Aprobar
                        </button>{" "}
                        <button disabled={trabajando === s.id} onClick={() => resolver(s, "rechazar")}>
                          Rechazar
                        </button>
                      </>
                    )}
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

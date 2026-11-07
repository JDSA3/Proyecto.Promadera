import { useEffect, useState } from "react";
import { enviarSolicitud, obtenerMiSolicitud } from "../../apiCorralon.js";

const AZUL = "#162039";
const ARENA = "#c9a27a";
const MAX_MB = 3;

const VACIO = {
  nombre_comercial: "",
  cuit: "",
  telefono: "",
  direccion: "",
  tipo_comprobante: "monotributo",
};

const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString("es-AR") : "-");

const caja = {
  background: "#fff",
  border: `1px solid ${ARENA}`,
  borderRadius: 12,
  padding: 16,
  margin: 16,
};

const campo = { display: "block", width: "100%", padding: 8, marginTop: 4, marginBottom: 8, boxSizing: "border-box" };

const boton = {
  marginTop: 12,
  padding: "8px 16px",
  background: AZUL,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

export default function SolicitudCorralon({ usuario }) {
  const [info, setInfo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = () =>
    obtenerMiSolicitud(usuario.id)
      .then((d) => {
        setInfo(d);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario.id]);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const elegirArchivo = (e) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo no puede pesar más de ${MAX_MB} MB`);
      e.target.value = "";
      setArchivo(null);
      return;
    }
    setError(null);
    setArchivo(f);
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (!archivo) {
      setError("Adjuntá el comprobante de monotributo o de ARCA");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await enviarSolicitud(usuario.id, form, archivo);
      setForm(VACIO);
      setArchivo(null);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return null;

  if (!info) {
    return (
      <div style={caja}>
        <p style={{ color: "#a33", margin: 0 }}>No se pudo cargar el estado de tu solicitud: {error}</p>
      </div>
    );
  }

  // Ya aprobado: no se muestra nada
  if (info.estado_cuenta === "aprobado") return null;

  if (info.estado_cuenta === "rechazado") {
    return (
      <div style={caja}>
        <strong style={{ color: AZUL }}>Tu cuenta de corralón fue rechazada.</strong>
        <p>Comunicate con el administrador.</p>
      </div>
    );
  }

  const solicitud = info.solicitud;

  if (solicitud?.estado === "pendiente") {
    return (
      <div style={caja}>
        <strong style={{ color: AZUL }}>Tu solicitud está en revisión</strong>
        <p>
          La enviaste el {fecha(solicitud.creado_en)} ({solicitud.nombre_comercial}). Cuando el administrador
          la apruebe vas a poder cargar tus productos.
        </p>
        <button type="button" style={boton} onClick={cargar}>
          Actualizar estado
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} style={caja}>
      <h3 style={{ color: AZUL, marginTop: 0 }}>Quiero ser corralón</h3>
      <p>
        Para cargar productos y vender necesitamos verificar tu actividad. Completá los datos y adjuntá tu
        comprobante de monotributo u otro de ARCA.
      </p>

      {solicitud?.estado === "rechazada" && (
        <p style={{ color: "#a33" }}>
          Tu solicitud anterior fue rechazada: {solicitud.motivo_rechazo}. Podés corregirla y enviarla de nuevo.
        </p>
      )}

      <label>
        Nombre comercial
        <input style={campo} name="nombre_comercial" value={form.nombre_comercial} onChange={cambiar} required maxLength={100} />
      </label>
      <label>
        CUIT (solo números)
        <input style={campo} name="cuit" value={form.cuit} onChange={cambiar} required inputMode="numeric" maxLength={13} />
      </label>
      <label>
        Teléfono (solo números)
        <input style={campo} name="telefono" value={form.telefono} onChange={cambiar} required inputMode="numeric" maxLength={20} />
      </label>
      <label>
        Dirección
        <input style={campo} name="direccion" value={form.direccion} onChange={cambiar} required maxLength={200} />
      </label>
      <label>
        Tipo de comprobante
        <select style={campo} name="tipo_comprobante" value={form.tipo_comprobante} onChange={cambiar}>
          <option value="monotributo">Constancia de monotributo</option>
          <option value="otro_arca">Otro comprobante de ARCA</option>
        </select>
      </label>
      <label>
        Archivo (PDF, PNG o JPG, hasta {MAX_MB} MB)
        <input style={campo} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={elegirArchivo} required />
      </label>

      {error && <p style={{ color: "#a33" }}>{error}</p>}

      <button type="submit" disabled={enviando} style={boton}>
        {enviando ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}

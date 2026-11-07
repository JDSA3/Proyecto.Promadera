import { useEffect, useState } from "react";
import {
  guardarPerfil,
  obtenerMiSolicitud,
  obtenerPerfil,
  subirLogo,
  urlLogo,
} from "../../apiCorralon.js";

const MAX_LOGO_MB = 1;

const campo = { display: "block", width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" };

export default function CorralonPerfil({ usuario }) {
  const [perfil, setPerfil] = useState(null);
  const [aprobado, setAprobado] = useState(false);
  const [form, setForm] = useState({ nombre_comercial: "", telefono: "", direccion: "" });
  const [version, setVersion] = useState(() => Date.now());
  const [mensaje, setMensaje] = useState(null); // { tipo: "ok" | "error", texto }
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const aplicar = (p) => {
    setPerfil(p);
    setForm({
      nombre_comercial: p.nombre_comercial ?? "",
      telefono: p.telefono ?? "",
      direccion: p.direccion ?? "",
    });
  };

  useEffect(() => {
    let vivo = true;
    Promise.all([obtenerPerfil(usuario.id, usuario.id), obtenerMiSolicitud(usuario.id)])
      .then(([p, mia]) => {
        if (!vivo) return;
        aplicar(p);
        setAprobado(mia.estado_cuenta === "aprobado");
      })
      .catch((e) => vivo && setMensaje({ tipo: "error", texto: e.message }));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario.id]);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      aplicar(await guardarPerfil(usuario.id, usuario.id, form));
      setMensaje({ tipo: "ok", texto: "Datos guardados." });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const elegirLogo = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    if (archivo.size > MAX_LOGO_MB * 1024 * 1024) {
      setMensaje({ tipo: "error", texto: `El logo no puede pesar más de ${MAX_LOGO_MB} MB` });
      return;
    }

    setSubiendo(true);
    setMensaje(null);
    try {
      setPerfil(await subirLogo(usuario.id, usuario.id, archivo));
      setVersion(Date.now());
      setMensaje({ tipo: "ok", texto: "Logo actualizado. Va a aparecer en tus comprobantes." });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setSubiendo(false);
    }
  };

  const nombre = perfil?.nombre_comercial || usuario.nombre;
  const inicial = (nombre || "C").trim().charAt(0).toUpperCase();

  return (
    <section className="cr-pagina">
      <div className="cr-cabecera">
        <div>
          <h2>Mi perfil</h2>
          <p className="cr-sub">Información de tu corralón.</p>
        </div>
      </div>

      {!perfil && !mensaje && <p>Cargando…</p>}

      {perfil && (
        <div className="cr-perfil">
          <div className="cr-perfil-cab">
            {perfil.tiene_logo ? (
              <img
                src={urlLogo(usuario.id, version)}
                alt={`Logo de ${nombre}`}
                style={{ width: 72, height: 72, objectFit: "contain", borderRadius: 8 }}
              />
            ) : (
              <div className="cr-avatar">{inicial}</div>
            )}
            <h3>{nombre}</h3>
          </div>

          {!aprobado && (
            <p className="cr-aviso">
              Vas a poder editar tus datos y subir tu logo cuando el administrador apruebe tu solicitud.
            </p>
          )}

          <div className="cr-dato">
            <label>Email de contacto</label>
            <div>{usuario.email || "—"}</div>
          </div>
          <div className="cr-dato">
            <label>CUIT</label>
            <div>{perfil.cuit || "—"}</div>
          </div>

          <form onSubmit={guardar}>
            <label>
              Nombre comercial
              <input style={campo} name="nombre_comercial" value={form.nombre_comercial} onChange={cambiar} required minLength={2} maxLength={100} disabled={!aprobado} />
            </label>
            <label>
              Teléfono (solo números)
              <input style={campo} name="telefono" value={form.telefono} onChange={cambiar} inputMode="numeric" maxLength={30} disabled={!aprobado} />
            </label>
            <label>
              Dirección
              <input style={campo} name="direccion" value={form.direccion} onChange={cambiar} maxLength={200} disabled={!aprobado} />
            </label>
            <label>
              Logo (PNG o JPG, hasta {MAX_LOGO_MB} MB)
              <input style={campo} type="file" accept=".png,.jpg,.jpeg" onChange={elegirLogo} disabled={!aprobado || subiendo} />
            </label>

            {mensaje && (
              <p style={{ color: mensaje.tipo === "ok" ? "#2a7a3b" : "#a33" }}>{mensaje.texto}</p>
            )}

            <button type="submit" className="cr-btn-icono" disabled={!aprobado || guardando} style={{ marginTop: 12 }}>
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>
        </div>
      )}

      {!perfil && mensaje && <p style={{ color: "#a33" }}>{mensaje.texto}</p>}
    </section>
  );
}

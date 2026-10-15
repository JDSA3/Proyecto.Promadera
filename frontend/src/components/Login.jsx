import { useState } from "react";
import { loginUsuario } from "../api.js";

const etiquetaPorRol = { cliente: "Carpintero", proveedor: "Corralón" };

function validar(form) {
  const errores = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errores.email = "Ingresá un email válido.";
  }
  if (form.password.length < 8) {
    errores.password = "La contraseña debe tener al menos 8 caracteres.";
  }
  return errores;
}

export default function Login({ rol, onLogin, onIrARegistro }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [verPassword, setVerPassword] = useState(false);
  const [recordarme, setRecordarme] = useState(true);
  const [aviso, setAviso] = useState("");
  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState("");
  const [enviando, setEnviando] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const erroresEncontrados = validar(form);
    setErrores(erroresEncontrados);
    setErrorServidor("");
    setAviso("");

    if (Object.keys(erroresEncontrados).length > 0) return;

    setEnviando(true);
    try {
      const usuario = await loginUsuario(form);

      if (usuario.rol !== rol) {
        setErrorServidor(
          `Esta cuenta es de ${etiquetaPorRol[usuario.rol]}, no de ${etiquetaPorRol[rol]}.`
        );
        return;
      }

      onLogin(usuario, recordarme);
    } catch {
      setErrorServidor("Email o contraseña incorrectos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="formulario-auth">
      <h3 className="auth-subtitulo">Iniciar sesión</h3>

      {errorServidor && <p className="error-campo">{errorServidor}</p>}
      {aviso && <p className="mensaje-exito">{aviso}</p>}

      <form onSubmit={handleSubmit} noValidate className="formulario">
        <div className="campo">
          <label htmlFor={`email-${rol}`}>Correo electrónico</label>
          <input
            id={`email-${rol}`}
            name="email"
            type="email"
            placeholder="tu@correo.com"
            value={form.email}
            onChange={handleChange}
          />
          {errores.email && <p className="error-campo">{errores.email}</p>}
        </div>

        <div className="campo">
          <label htmlFor={`password-${rol}`}>Contraseña</label>
          <div className="campo-password">
            <input
              id={`password-${rol}`}
              name="password"
              type={verPassword ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className="btn-ojo"
              onClick={() => setVerPassword(!verPassword)}
              aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {verPassword ? "🙈" : "👁"}
            </button>
          </div>
          {errores.password && <p className="error-campo">{errores.password}</p>}
        </div>

        <div className="fila-recordar">
          <label>
            <input
              type="checkbox"
              checked={recordarme}
              onChange={(e) => setRecordarme(e.target.checked)}
            />{" "}
            Recordarme
          </label>
          <button
            type="button"
            className="link-boton"
            onClick={() => setAviso("La recuperación de contraseña estará disponible próximamente.")}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <button type="submit" className="btn-ingresar" disabled={enviando}>
          {enviando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <p className="texto-auxiliar centrado">
        <button type="button" className="link-boton" onClick={onIrARegistro}>
          Crear una cuenta
        </button>
      </p>
    </div>
  );
}
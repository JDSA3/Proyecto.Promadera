import { useState } from "react";
import { loginUsuario } from "../api.js";

const etiquetaPorRol = { cliente: "Armador", proveedor: "Proveedor" };

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

      onLogin(usuario);
    } catch (err) {
      setErrorServidor("Email o contraseña incorrectos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="formulario-auth">
      <h3>Ingresar como {etiquetaPorRol[rol]}</h3>

      {errorServidor && <p className="error-campo">{errorServidor}</p>}

      <form onSubmit={handleSubmit} noValidate className="formulario">
        <div className="campo">
          <label htmlFor={`email-${rol}`}>Email</label>
          <input
            id={`email-${rol}`}
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />
          {errores.email && <p className="error-campo">{errores.email}</p>}
        </div>

        <div className="campo">
          <label htmlFor={`password-${rol}`}>Contraseña</label>
          <input
            id={`password-${rol}`}
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
          />
          {errores.password && <p className="error-campo">{errores.password}</p>}
        </div>

        <button type="submit" className="btn-crear" disabled={enviando}>
          {enviando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <p className="texto-auxiliar">
        ¿No tenés cuenta de {etiquetaPorRol[rol]}?{" "}
        <button type="button" className="link-boton" onClick={onIrARegistro}>
          Registrate
        </button>
      </p>
    </div>
  );
}

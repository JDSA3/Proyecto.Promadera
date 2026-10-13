import { useState } from "react";
import { registrarUsuario } from "../api.js";

const etiquetaPorRol = { cliente: "Armador", proveedor: "Proveedor" };

function validar(form) {
  const errores = {};
  if (form.nombre.trim().length < 2) {
    errores.nombre = "El nombre debe tener al menos 2 caracteres.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errores.email = "Ingresá un email válido.";
  }
  if (form.password.length < 8) {
    errores.password = "La contraseña debe tener al menos 8 caracteres.";
  }
  if (form.confirmarPassword !== form.password) {
    errores.confirmarPassword = "Las contraseñas no coinciden.";
  }
  return errores;
}

export default function Registro({ rol, onRegistroExitoso, onIrALogin }) {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmarPassword: "",
  });
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
      const usuario = await registrarUsuario({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        rol,
      });
      onRegistroExitoso(usuario);
    } catch (err) {
      setErrorServidor("No se pudo crear la cuenta. ¿Quizás el email ya está registrado?");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="formulario-auth">
      <h3>Registrarse como {etiquetaPorRol[rol]}</h3>

      {errorServidor && <p className="error-campo">{errorServidor}</p>}

      <form onSubmit={handleSubmit} noValidate className="formulario">
        <div className="campo">
          <label htmlFor={`nombre-${rol}`}>Nombre</label>
          <input
            id={`nombre-${rol}`}
            name="nombre"
            type="text"
            value={form.nombre}
            onChange={handleChange}
          />
          {errores.nombre && <p className="error-campo">{errores.nombre}</p>}
        </div>

        <div className="campo">
          <label htmlFor={`email-reg-${rol}`}>Email</label>
          <input
            id={`email-reg-${rol}`}
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />
          {errores.email && <p className="error-campo">{errores.email}</p>}
        </div>

        <div className="campo">
          <label htmlFor={`password-reg-${rol}`}>Contraseña</label>
          <input
            id={`password-reg-${rol}`}
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
          />
          {errores.password && <p className="error-campo">{errores.password}</p>}
        </div>

        <div className="campo">
          <label htmlFor={`confirmar-${rol}`}>Confirmar contraseña</label>
          <input
            id={`confirmar-${rol}`}
            name="confirmarPassword"
            type="password"
            value={form.confirmarPassword}
            onChange={handleChange}
          />
          {errores.confirmarPassword && (
            <p className="error-campo">{errores.confirmarPassword}</p>
          )}
        </div>

        <button type="submit" className="btn-crear" disabled={enviando}>
          {enviando ? "Creando cuenta..." : "Registrarme"}
        </button>
      </form>

      <p className="texto-auxiliar">
        ¿Ya tenés cuenta de {etiquetaPorRol[rol]}?{" "}
        <button type="button" className="link-boton" onClick={onIrALogin}>
          Ingresá
        </button>
      </p>
    </div>
  );
}
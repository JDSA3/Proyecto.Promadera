import { useState } from "react";

const vacio = { nombre: "", email: "", mensaje: "" };

function validar(form) {
  const errores = {};
  if (form.nombre.trim().length < 2) {
    errores.nombre = "El nombre debe tener al menos 2 caracteres.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errores.email = "Ingresá un email válido.";
  }
  if (form.mensaje.trim().length < 10) {
    errores.mensaje = "El mensaje debe tener al menos 10 caracteres.";
  }
  return errores;
}

export default function Contacto() {
  const [form, setForm] = useState(vacio);
  const [errores, setErrores] = useState({});
  const [enviado, setEnviado] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const erroresEncontrados = validar(form);
    setErrores(erroresEncontrados);

    if (Object.keys(erroresEncontrados).length === 0) {
      // TODO: conectar con el backend cuando exista el endpoint de contacto
      console.log("Formulario de contacto (sin conectar todavia):", form);
      setEnviado(true);
      setForm(vacio);
    }
  }

  return (
    <section id="contacto">
      <h2>Contacto</h2>

      {enviado && (
        <p className="mensaje-exito">¡Gracias por tu mensaje! Te vamos a responder a la brevedad.</p>
      )}

      <form onSubmit={handleSubmit} noValidate className="formulario">
        <div className="campo">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={form.nombre}
            onChange={handleChange}
          />
          {errores.nombre && <p className="error-campo">{errores.nombre}</p>}
        </div>

        <div className="campo">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />
          {errores.email && <p className="error-campo">{errores.email}</p>}
        </div>

        <div className="campo">
          <label htmlFor="mensaje">Mensaje</label>
          <textarea
            id="mensaje"
            name="mensaje"
            rows="4"
            value={form.mensaje}
            onChange={handleChange}
          />
          {errores.mensaje && <p className="error-campo">{errores.mensaje}</p>}
        </div>

        <button type="submit" className="boton-mapa">Enviar</button>
      </form>
    </section>
  );
}
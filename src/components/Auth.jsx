import { useState } from "react";

import Login from "./Login.jsx";
import Registro from "./Registro.jsx";

const etiquetaPorRol = { cliente: "Armador", proveedor: "Proveedor" };

export default function Auth({ usuario, onLogin, onLogout }) {
  const [rol, setRol] = useState("cliente");
  const [modo, setModo] = useState("login");

  if (usuario) {
    return (
      <section id="cuenta">
        <h2>Mi cuenta</h2>
        <p>
          Hola, <strong>{usuario.nombre}</strong> ({etiquetaPorRol[usuario.rol]})
        </p>
        <button type="button" className="btn-cancelar" onClick={onLogout}>
          Cerrar sesión
        </button>
      </section>
    );
  }

  return (
    <section id="cuenta">
      <h2>Mi cuenta</h2>

      <div className="tabs-rol">
        <button
          type="button"
          className={rol === "cliente" ? "tab-rol activo" : "tab-rol"}
          onClick={() => setRol("cliente")}
        >
          Armador
        </button>
        <button
          type="button"
          className={rol === "proveedor" ? "tab-rol activo" : "tab-rol"}
          onClick={() => setRol("proveedor")}
        >
          Proveedor
        </button>
      </div>

      {modo === "login" ? (
        <Login
          rol={rol}
          onLogin={onLogin}
          onIrARegistro={() => setModo("registro")}
        />
      ) : (
        <Registro
          rol={rol}
          onRegistroExitoso={onLogin}
          onIrALogin={() => setModo("login")}
        />
      )}
    </section>
  );
}

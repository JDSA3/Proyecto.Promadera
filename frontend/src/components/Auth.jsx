import { useState } from "react";
import Login from "./Login.jsx";
import Registro from "./Registro.jsx";

export default function Auth({ onLogin }) {
  const [rol, setRol] = useState("cliente");
  const [modo, setModo] = useState("login");

  return (
    <div className="pantalla-auth">
      <span className="mancha m1" aria-hidden="true" />
      <span className="mancha m2" aria-hidden="true" />
      <span className="mancha m3" aria-hidden="true" />

      <div className="auth-marca">
        <img src="/logo.png" alt="" />
        <span>ProMadera</span>
      </div>

      <div className="auth-tarjeta">
        <h2>
          {modo === "login" ? (
            <>Bienvenido a<br />ProMadera</>
          ) : (
            "Crear una cuenta"
          )}
        </h2>
        <div className="auth-linea" />

        <div className="tabs-rol">
          <button
            type="button"
            className={rol === "cliente" ? "tab-rol activo" : "tab-rol"}
            onClick={() => setRol("cliente")}
          >
            Carpintero
          </button>
          <button
            type="button"
            className={rol === "proveedor" ? "tab-rol activo" : "tab-rol"}
            onClick={() => setRol("proveedor")}
          >
            Corralón
          </button>
        </div>

        {modo === "login" ? (
          <Login rol={rol} onLogin={onLogin} onIrARegistro={() => setModo("registro")} />
        ) : (
          <Registro rol={rol} onRegistroExitoso={onLogin} onIrALogin={() => setModo("login")} />
        )}
      </div>
    </div>
  );
}
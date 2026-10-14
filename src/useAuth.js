import { useState, useCallback } from "react";

const CLAVE = "promadera_usuario";

function leerUsuarioGuardado() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
}

export default function useAuth() {
  const [usuario, setUsuario] = useState(leerUsuarioGuardado);

  const guardarSesion = useCallback((datosUsuario) => {
    setUsuario(datosUsuario);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datosUsuario));
    } catch {
      // si falla el localStorage, la sesion sigue viva en memoria igual
    }
  }, []);

  const cerrarSesion = useCallback(() => {
    setUsuario(null);
    try {
      localStorage.removeItem(CLAVE);
    } catch {
      // nada que hacer si falla
    }
  }, []);

  return { usuario, guardarSesion, cerrarSesion };
}

import { useState, useCallback } from "react";

const CLAVE = "promadera_usuario";

function leerUsuarioGuardado() {
  try {
    const guardado =
      localStorage.getItem(CLAVE) ?? sessionStorage.getItem(CLAVE);
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
}

export default function useAuth() {
  const [usuario, setUsuario] = useState(leerUsuarioGuardado);

  // recordar = true  -> sigue iniciada al cerrar el navegador
  // recordar = false -> se pierde al cerrar la pestaña
  const guardarSesion = useCallback((datosUsuario, recordar = true) => {
    setUsuario(datosUsuario);
    try {
      const storage = recordar ? localStorage : sessionStorage;
      storage.setItem(CLAVE, JSON.stringify(datosUsuario));
    } catch {
      // si falla el storage, la sesión sigue viva en memoria
    }
  }, []);

  const cerrarSesion = useCallback(() => {
    setUsuario(null);
    try {
      localStorage.removeItem(CLAVE);
      sessionStorage.removeItem(CLAVE);
    } catch {
      // nada que hacer si falla
    }
  }, []);

  return { usuario, guardarSesion, cerrarSesion };
}
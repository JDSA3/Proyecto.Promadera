import { useCallback, useEffect, useState } from "react";

const clave = (usuarioId) => `promadera_proyectos_${usuarioId}`;

function leer(usuarioId) {
  try {
    const guardado = usuarioId ? localStorage.getItem(clave(usuarioId)) : null;
    return guardado ? JSON.parse(guardado) : [];
  } catch {
    return [];
  }
}

export default function useProyectos(usuarioId) {
  const [proyectos, setProyectos] = useState(() => leer(usuarioId));

  useEffect(() => {
    setProyectos(leer(usuarioId));
  }, [usuarioId]);

  const actualizar = useCallback(
    (cambio) => {
      setProyectos((anteriores) => {
        const nuevos = cambio(anteriores);
        try {
          if (usuarioId) localStorage.setItem(clave(usuarioId), JSON.stringify(nuevos));
        } catch {
          // si falla el storage, los proyectos siguen en memoria
        }
        return nuevos;
      });
    },
    [usuarioId]
  );

  // datos: { nombre, ambiente, disenoId, medidas, acabado }
  const guardar = useCallback(
    (datos) =>
      actualizar((prev) => [{ id: Date.now(), creado: new Date().toISOString(), ...datos }, ...prev]),
    [actualizar]
  );

  const eliminar = useCallback(
    (id) => actualizar((prev) => prev.filter((p) => p.id !== id)),
    [actualizar]
  );

  return { proyectos, guardar, eliminar };
}

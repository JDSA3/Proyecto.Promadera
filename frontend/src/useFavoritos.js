import { useEffect, useState } from "react";

const CLAVE = "promadera_favoritos";

function leerGuardados() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE));
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

// Guarda los IDs de productos favoritos en localStorage (MVP sin login)
export default function useFavoritos() {
  const [favoritos, setFavoritos] = useState(leerGuardados);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(favoritos));
    } catch (err) {
      console.error("No se pudieron guardar los favoritos:", err);
    }
  }, [favoritos]);

  function alternarFavorito(id) {
    setFavoritos((actuales) =>
      actuales.includes(id) ? actuales.filter((f) => f !== id) : [...actuales, id]
    );
  }

  return { favoritos, alternarFavorito };
}
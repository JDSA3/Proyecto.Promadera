import { useCallback, useEffect, useState } from "react";
import { obtenerProductos } from "../../api.js";

export const STOCK_MINIMO = 10; // umbral fijo hasta tener stock_minimo por producto en la API

export function estadoStock(stock) {
  if (stock <= 0) return { clase: "agotado", texto: "Agotado" };
  if (stock <= STOCK_MINIMO) return { clase: "bajo", texto: "Stock bajo" };
  return { clase: "ok", texto: "Disponible" };
}

export function formatearPrecio(n) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default function useProductosCorralon(proveedorId) {
  const [productos, setProductos] = useState(null); // null = cargando
  const [error, setError] = useState(false);

  const recargar = useCallback(() => {
    obtenerProductos({ proveedorId })
      .then((d) => { setProductos(d.filter((p) => p.activo)); setError(false); })
      .catch((e) => { console.error(e); setError(true); });
  }, [proveedorId]);

  useEffect(() => { recargar(); }, [recargar]);

  return { productos, error, recargar };
}
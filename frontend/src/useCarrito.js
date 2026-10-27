import { useCallback, useEffect, useState } from "react";

const clave = (usuarioId) => `promadera_carrito_${usuarioId}`;

// Un mismo producto puede estar varias veces en el carrito con cortes de distinto largo.
const claveItem = (productoId, largoCm) => `${productoId}|${largoCm ?? ""}`;

function leer(usuarioId) {
  try {
    const guardado = usuarioId ? localStorage.getItem(clave(usuarioId)) : null;
    const items = guardado ? JSON.parse(guardado) : [];
    // Carritos guardados antes de los cortes: se les agrega la clave
    return items.map((i) => ({ ...i, largo_cm: i.largo_cm ?? null, clave: i.clave ?? claveItem(i.producto_id, i.largo_cm) }));
  } catch {
    return [];
  }
}

export default function useCarrito(usuarioId) {
  const [items, setItems] = useState(() => leer(usuarioId));

  // Si cambia el usuario (cierra sesión y entra otro), carga su carrito
  useEffect(() => {
    setItems(leer(usuarioId));
  }, [usuarioId]);

  const actualizar = useCallback(
    (cambio) => {
      setItems((anteriores) => {
        const nuevos = cambio(anteriores);
        try {
          if (usuarioId) localStorage.setItem(clave(usuarioId), JSON.stringify(nuevos));
        } catch {
          // si falla el storage, el carrito sigue en memoria
        }
        return nuevos;
      });
    },
    [usuarioId]
  );

  // corte (opcional): { largoCm, precio, stockMaximo } para un corte a medida.
  // Sin corte se agrega la pieza entera, como siempre.
  const agregar = useCallback(
    (producto, cantidad = 1, corte = null) => {
      const stock = corte ? corte.stockMaximo : producto.stock;
      if (stock <= 0) return;
      const largoCm = corte ? corte.largoCm : null;
      const precio = corte ? corte.precio : producto.precio;
      const claveDelItem = claveItem(producto.id, largoCm);
      actualizar((prev) => {
        const existente = prev.find((i) => i.clave === claveDelItem);
        if (existente) {
          return prev.map((i) =>
            i.clave === claveDelItem
              ? { ...i, stock, precio, cantidad: Math.min(i.cantidad + cantidad, stock) }
              : i
          );
        }
        return [
          ...prev,
          {
            clave: claveDelItem,
            producto_id: producto.id,
            nombre: producto.nombre,
            precio,
            stock,
            cantidad: Math.min(cantidad, stock),
            largo_cm: largoCm,
            proveedor_id: producto.proveedor_id ?? null,
            proveedor_nombre: producto.proveedor_nombre || `Corralón #${producto.proveedor_id}`,
          },
        ];
      });
    },
    [actualizar]
  );

  const cambiarCantidad = useCallback(
    (claveDelItem, cantidad) => {
      const n = Number(cantidad) || 1;
      actualizar((prev) =>
        prev.map((i) =>
          i.clave === claveDelItem ? { ...i, cantidad: Math.max(1, Math.min(n, i.stock)) } : i
        )
      );
    },
    [actualizar]
  );

  const quitar = useCallback(
    (claveDelItem) => actualizar((prev) => prev.filter((i) => i.clave !== claveDelItem)),
    [actualizar]
  );

  const vaciar = useCallback(() => actualizar(() => []), [actualizar]);

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const cantidadTotal = items.reduce((s, i) => s + i.cantidad, 0);

  return { items, agregar, cambiarCantidad, quitar, vaciar, total, cantidadTotal };
}

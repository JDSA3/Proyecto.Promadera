import { useCallback, useEffect, useState } from "react";

const clave = (usuarioId) => `promadera_carrito_${usuarioId}`;

function leer(usuarioId) {
  try {
    const guardado = usuarioId ? localStorage.getItem(clave(usuarioId)) : null;
    return guardado ? JSON.parse(guardado) : [];
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

  const agregar = useCallback(
    (producto, cantidad = 1) => {
      if (producto.stock <= 0) return;
      actualizar((prev) => {
        const existente = prev.find((i) => i.producto_id === producto.id);
        if (existente) {
          return prev.map((i) =>
            i.producto_id === producto.id
              ? { ...i, stock: producto.stock, cantidad: Math.min(i.cantidad + cantidad, producto.stock) }
              : i
          );
        }
               return [
          ...prev,
          {
            producto_id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            stock: producto.stock,
            cantidad: Math.min(cantidad, producto.stock),
            proveedor_id: producto.proveedor_id ?? null,
            proveedor_nombre: producto.proveedor_nombre || `Corralón #${producto.proveedor_id}`,
          },
        ];
      });
    },
    [actualizar]
  );

  const cambiarCantidad = useCallback(
    (productoId, cantidad) => {
      const n = Number(cantidad) || 1;
      actualizar((prev) =>
        prev.map((i) =>
          i.producto_id === productoId ? { ...i, cantidad: Math.max(1, Math.min(n, i.stock)) } : i
        )
      );
    },
    [actualizar]
  );

  const quitar = useCallback(
    (productoId) => actualizar((prev) => prev.filter((i) => i.producto_id !== productoId)),
    [actualizar]
  );

  const vaciar = useCallback(() => actualizar(() => []), [actualizar]);

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const cantidadTotal = items.reduce((s, i) => s + i.cantidad, 0);

  return { items, agregar, cambiarCantidad, quitar, vaciar, total, cantidadTotal };
}

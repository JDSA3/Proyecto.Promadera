import { useEffect, useRef, useState } from "react";
import "./Carrito.css";

// Botón "Agregar al carrito" del detalle de producto.
// Muestra un aviso breve al agregar, porque si no el único cambio es el número del menú.
export default function BotonCarrito({ producto, onAgregar }) {
  const [agregado, setAgregado] = useState(false);
  const temporizador = useRef(null);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const sinStock = producto.stock <= 0;

  function agregar() {
    onAgregar(producto);
    setAgregado(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAgregado(false), 1800);
  }

  return (
    <button
      type="button"
      className="btn-tan btn-carrito"
      disabled={sinStock}
      onClick={agregar}
      aria-live="polite"
    >
      {sinStock ? "Sin stock" : agregado ? "✓ Agregado al carrito" : "🛒 Agregar al carrito"}
    </button>
  );
}

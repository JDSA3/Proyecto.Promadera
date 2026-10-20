import { useEffect, useState } from "react";
import { obtenerRecomendados } from "../api.js";
import "./ProductosRecomendados.css";

function formatearPrecio(precio) {
  return precio.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

// Muestra los productos que combinan con el que se está mirando.
// Si no hay recomendaciones, o la API falla, no muestra nada (no es información crítica).
export default function ProductosRecomendados({ productoId, onVerDetalle }) {
  const [recomendados, setRecomendados] = useState(null); // null = cargando

  useEffect(() => {
    let cancelado = false;
    setRecomendados(null);
    obtenerRecomendados(productoId, 6)
      .then((datos) => {
        if (!cancelado) setRecomendados(datos);
      })
      .catch((err) => {
        console.error("No se pudieron cargar las recomendaciones:", err);
        if (!cancelado) setRecomendados([]);
      });
    return () => {
      cancelado = true;
    };
  }, [productoId]);

  if (recomendados !== null && recomendados.length === 0) return null;

  function abrir(e, producto) {
    // Al cambiar de producto, volver al principio del detalle.
    e.currentTarget.closest(".modal-contenido")?.scrollTo({ top: 0, behavior: "smooth" });
    onVerDetalle?.(producto);
  }

  return (
    <section className="modal-seccion recomendados">
      <h3>Productos que combinan</h3>

      {recomendados === null ? (
        <p className="recomendados-estado">Buscando productos que combinan…</p>
      ) : (
        <ul className="recomendados-lista">
          {recomendados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="recomendado"
                onClick={(e) => abrir(e, p)}
                aria-label={`Ver ${p.nombre}`}
              >
                <img
                  src={`/imagenes/${p.id}.webp`}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/logo.png";
                  }}
                />
                <span className="recomendado-nombre">{p.nombre}</span>
                <span className="recomendado-motivo">{p.motivo}</span>
                <span className="recomendado-precio">{formatearPrecio(p.precio)}</span>
                {p.stock <= 0 && <span className="recomendado-agotado">Sin stock</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

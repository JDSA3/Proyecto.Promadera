import { useEffect, useState } from "react";
import { obtenerProductos } from "../api.js";
import ProductoCard from "./ProductoCard.jsx";

export default function Favoritos({ favoritos, onAlternarFavorito }) {
  const [productos, setProductos] = useState(null); // null = todavía no cargó
  const [error, setError] = useState(false);

  // Se cargan todos los productos una vez y se filtran localmente por los IDs guardados
  useEffect(() => {
    let cancelado = false;
    obtenerProductos({})
      .then((datos) => {
        if (cancelado) return;
        setProductos(datos);
        setError(false);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error("No se pudieron cargar los favoritos:", err);
        setError(true);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const guardados = productos
    ? productos.filter((p) => p.activo && favoritos.includes(p.id))
    : [];

  function contenido() {
    if (error) {
      return (
        <p className="mensaje">
          No se pudo conectar con el servidor. Verifica que la API esté encendida.
        </p>
      );
    }
    if (productos === null) return null;
    if (guardados.length === 0) {
      return (
        <p className="mensaje">
          Todavía no tenés favoritos. Tocá el corazón de un producto para guardarlo acá.
        </p>
      );
    }
    return guardados.map((p) => (
      <ProductoCard
        key={p.id}
        producto={p}
        esFavorito
        onAlternarFavorito={onAlternarFavorito}
      />
    ));
  }

  return (
    <section id="favoritos">
      <h2>Favoritos</h2>
      <div id="lista-favoritos">{contenido()}</div>
    </section>
  );
}
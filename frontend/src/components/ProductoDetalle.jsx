import ProductosRecomendados from "./ProductosRecomendados";
import BotonCarrito from "./BotonCarrito.jsx";

function formatearPrecio(precio) {
  return precio.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export default function ProductoDetalle({ producto, esFavorito, onAlternarFavorito, onCerrar, onVerDetalle, onAgregarAlCarrito }) {
  if (!producto) return null;

  const caracteristicas = producto.caracteristicas
    ? Object.entries(producto.caracteristicas)
    : [];

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>

        <div className="modal-grid">
          <img
            src={`/imagenes/${producto.id}.webp`}
            alt={producto.nombre}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/logo.png";
            }}
          />

          <div className="modal-info">
            <p className="categoria">{producto.categoria.nombre}</p>
            <h2>{producto.nombre}</h2>
            <p className="precio-detalle">{formatearPrecio(producto.precio)}</p>

            <p className={producto.stock > 0 ? "stock-disponible" : "stock-agotado"}>
              {producto.stock > 0 ? `${producto.stock} unidades disponibles` : "Sin stock"}
            </p>

                          {onAgregarAlCarrito && (
              <BotonCarrito key={producto.id} producto={producto} onAgregar={onAgregarAlCarrito} />
            )}

            <button
              type="button"
              className={`btn-favorito-detalle${esFavorito ? " activo" : ""}`}
              onClick={() => onAlternarFavorito(producto.id)}
            >
              {esFavorito ? "♥ Quitar de favoritos" : "♡ Agregar a favoritos"}
            </button>
          </div>
        </div>

        {producto.descripcion && (
          <section className="modal-seccion">
            <h3>Descripción</h3>
            <p>{producto.descripcion}</p>
          </section>
        )}

        {caracteristicas.length > 0 && (
          <section className="modal-seccion">
            <h3>Características</h3>
            <table className="tabla-caracteristicas">
              <tbody>
                {caracteristicas.map(([nombre, valor]) => (
                  <tr key={nombre}>
                    <th>{nombre}</th>
                    <td>{valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {onVerDetalle && (
          <ProductosRecomendados
            key={producto.id}
            productoId={producto.id}
            onVerDetalle={onVerDetalle}
          />
        )}
      </div>
    </div>
  );
}
function formatearPrecio(precio) {
  return precio.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export default function ProductoCard({ producto, esFavorito, onAlternarFavorito, onVerDetalle }) {
  return (
    <div
      className="producto"
      onClick={() => onVerDetalle?.(producto)}
      role="button"
      tabIndex={0}
    >
      {onAlternarFavorito && (
        <button
          type="button"
          className={`btn-favorito${esFavorito ? " activo" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onAlternarFavorito(producto.id);
          }}
          aria-pressed={esFavorito}
          aria-label={
            esFavorito
              ? `Quitar ${producto.nombre} de favoritos`
              : `Agregar ${producto.nombre} a favoritos`
          }
        >
          {esFavorito ? "♥" : "♡"}
        </button>
      )}
      <img
        src={`/imagenes/${producto.id}.webp`}
        alt={producto.nombre}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = "/logo.png";
        }}
      />
      <h3>{producto.nombre}</h3>
      <p className="categoria">{producto.categoria.nombre}</p>
            {producto.proveedor_nombre && (
      <p className="corralon-nombre">🏬 {producto.proveedor_nombre}</p>
      )}
      <p className="precio">{formatearPrecio(producto.precio)}</p>
      <p className="stock">Stock: {producto.stock}</p>
    </div>
  );
}
function formatearPrecio(precio) {
  return precio.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export default function ProductoCard({ producto }) {
  return (
    <div className="producto">
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
      <p className="precio">{formatearPrecio(producto.precio)}</p>
      <p className="stock">Stock: {producto.stock}</p>
    </div>
  );
}

import ProductoForm from "./ProductoForm.jsx";

export default function ModalProducto({ producto, esNuevo, categorias, onSubmit, onCerrar }) {
  if (!producto && !esNuevo) return null;

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>

        <h2>{esNuevo ? "Agregar producto" : "Editar producto"}</h2>

        <ProductoForm
          producto={esNuevo ? null : producto}
          categorias={categorias}
          onSubmit={onSubmit}
          onCancel={onCerrar}
        />
      </div>
    </div>
  );
}
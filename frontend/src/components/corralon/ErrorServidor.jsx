// Mensaje de error de conexión con botón para volver a intentar.
export default function ErrorServidor({ onReintentar }) {
  return (
    <span role="alert">
      No se pudo conectar con el servidor.{" "}
      <button type="button" className="cr-btn-icono" onClick={onReintentar}>
        Reintentar
      </button>
    </span>
  );
}

export default function Localizacion() {
  const direccion = "Av. Siempre Viva 123, Salta, Argentina";
  const urlGoogleMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;

  return (
    <section id="localizacion">
      <h2>Localización</h2>
      <p className="direccion">{direccion}</p>
      <a
        href={urlGoogleMaps}
        target="_blank"
        rel="noopener noreferrer"
        className="boton-mapa"
      >
        Cómo llegar
      </a>
    </section>
  );
}

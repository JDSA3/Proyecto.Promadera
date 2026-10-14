export default function Localizacion() {
  const direccion = "Av. Siempre Viva 123, Salta, Argentina";
  const urlGoogleMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
  const urlMapaEmbebido = `https://www.google.com/maps?q=${encodeURIComponent(direccion)}&output=embed`;

  return (
    <section id="localizacion">
      <h2>Localización</h2>
      <p className="direccion">{direccion}</p>

      <div className="mapa-embebido">
        <iframe
          title="Ubicación de ProMadera"
          src={urlMapaEmbebido}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <a
        href={urlGoogleMaps}
        target="_blank"
        rel="noopener noreferrer"
        className="boton-mapa"
      >
        Abrir en Google Maps
      </a>
    </section>
  );
}
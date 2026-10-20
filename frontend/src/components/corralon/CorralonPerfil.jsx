export default function CorralonPerfil({ usuario }) {
  const inicial = (usuario.nombre || "C").trim().charAt(0).toUpperCase();

  return (
    <section className="cr-pagina">
      <div className="cr-cabecera">
        <div>
          <h2>Mi perfil</h2>
          <p className="cr-sub">Información de tu corralón.</p>
        </div>
      </div>

      <div className="cr-perfil">
        <div className="cr-perfil-cab">
          <div className="cr-avatar">{inicial}</div>
          <h3>{usuario.nombre}</h3>
        </div>
        <div className="cr-dato">
          <label>Nombre del corralón</label>
          <div>{usuario.nombre}</div>
        </div>
        <div className="cr-dato">
          <label>Email de contacto</label>
          <div>{usuario.email || "—"}</div>
        </div>
        <p className="cr-aviso">
          La edición de datos (teléfono y logo) se habilita cuando la API tenga el endpoint de perfil.
        </p>
      </div>
    </section>
  );
}

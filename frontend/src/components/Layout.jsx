import { useState } from "react";

export default function Layout({
  menu,
  vista,
  onCambiarVista,
  etiqueta,
  onCerrarSesion,
  bloqueado = false, // true: el menú no se puede desplegar (cuenta de corralón sin aprobar)
  children,
}) {
  const [menuVisible, setMenuVisible] = useState(() => window.innerWidth > 760);

  function elegir(id) {
    onCambiarVista(id);
    if (window.innerWidth <= 760) setMenuVisible(false);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          type="button"
          className="btn-hamburguesa"
          onClick={() => setMenuVisible(!menuVisible)}
          disabled={bloqueado}
          title={bloqueado ? "El menú se habilita cuando se apruebe tu cuenta" : undefined}
          style={bloqueado ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
          aria-label="Mostrar u ocultar menú"
        >
          ☰
        </button>
        <div className="app-marca">
          <img src="/logo.png" alt="" />
          <span>ProMadera</span>
        </div>
        {/* Con el menú bloqueado, el botón de salir va en el encabezado para no quedar sin salida */}
        {bloqueado && onCerrarSesion && (
          <button
            type="button"
            className="menu-item menu-salir"
            onClick={onCerrarSesion}
            style={{ width: "auto", marginLeft: "auto", marginRight: 16 }}
          >
            Cerrar sesión
          </button>
        )}
      </header>

      <div className="app-cuerpo">
        {menuVisible && !bloqueado && (
          <nav className="app-menu">
            {etiqueta && <p className="menu-etiqueta">{etiqueta}</p>}
            {menu.map((item) => (
              <button
                key={item.id}
                type="button"
                className={vista === item.id ? "menu-item activo" : "menu-item"}
                onClick={() => elegir(item.id)}
              >
                {item.label}
              </button>
            ))}
            {onCerrarSesion && (
              <button
                type="button"
                className="menu-item menu-salir"
                onClick={onCerrarSesion}
              >
                Cerrar sesión
              </button>
            )}
          </nav>
        )}

        <main className="app-contenido">{children}</main>
      </div>

      <footer className="app-footer">
        <span className="footer-redes">
          <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">f</a>
          <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X">X</a>
        </span>
        <span>@Promadera2026</span>
        <span className="footer-redes">
          <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">IG</a>
          <a href="https://wa.me/" target="_blank" rel="noreferrer" aria-label="WhatsApp">WA</a>
        </span>
      </footer>
    </div>
  );
}
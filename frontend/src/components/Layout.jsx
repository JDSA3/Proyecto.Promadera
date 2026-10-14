import { useState } from "react";

export default function Layout({
  menu,
  vista,
  onCambiarVista,
  etiqueta,
  onCerrarSesion,
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
          aria-label="Mostrar u ocultar menú"
        >
          ☰
        </button>
        <div className="app-marca">
          <img src="/logo.png" alt="" />
          <span>ProMadera</span>
        </div>
      </header>

      <div className="app-cuerpo">
        {menuVisible && (
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
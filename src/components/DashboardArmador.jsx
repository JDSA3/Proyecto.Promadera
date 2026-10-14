import { useState } from "react";
import Diseno from "./Diseno.jsx";
import Proyectos from "./Proyectos.jsx";
import Productos from "./Productos.jsx";
import Favoritos from "./Favoritos.jsx";
import Localizacion from "./Localizacion.jsx";

const SECCIONES = [
  { key: "diseno", label: "Diseño" },
  { key: "proyectos", label: "Mis Proyectos" },
  { key: "insumos", label: "Insumos" },
  { key: "favoritos", label: "Favoritos" },
  { key: "localizacion", label: "Localización" },
];

export default function DashboardArmador({ usuario, favoritos, onAlternarFavorito, onLogout, onVolverAlSitio }) {
  const [seccionActiva, setSeccionActiva] = useState("diseno");

  function contenido() {
    switch (seccionActiva) {
      case "diseno":
        return <Diseno />;
      case "proyectos":
        return <Proyectos />;
      case "insumos":
        return <Productos favoritos={favoritos} onAlternarFavorito={onAlternarFavorito} />;
      case "favoritos":
        return <Favoritos favoritos={favoritos} onAlternarFavorito={onAlternarFavorito} />;
      case "localizacion":
        return <Localizacion />;
      default:
        return null;
    }
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="ProMadera" width="40" />
          <span>ProMadera</span>
        </div>

        <nav className="sidebar-nav">
          {SECCIONES.map((s) => (
            <button
              key={s.key}
              type="button"
              className={seccionActiva === s.key ? "sidebar-item activo" : "sidebar-item"}
              onClick={() => setSeccionActiva(s.key)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>{usuario.nombre}</p>
          <button type="button" className="sidebar-item" onClick={onVolverAlSitio}>
            ← Sitio público
          </button>
          <button type="button" className="sidebar-item" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="dashboard-contenido">{contenido()}</main>
    </div>
  );
}

import { useState } from "react";
import Layout from "./components/Layout.jsx";
import Auth from "./components/Auth.jsx";
import Diseno from "./components/Diseno.jsx";
import Proyectos from "./components/Proyectos.jsx";
import Productos from "./components/Productos.jsx";
import Favoritos from "./components/Favoritos.jsx";
import Localizacion from "./components/Localizacion.jsx";
import useFavoritos from "./useFavoritos.js";
import useAuth from "./useAuth.js";
import MisProductos from "./components/MisProductos.jsx";

const MENU_CARPINTERO = [
  { id: "diseno", label: "Diseño" },
  { id: "proyectos", label: "Mis Proyectos" },
  { id: "insumos", label: "Insumos" },
  { id: "favoritos", label: "Favoritos" },
  { id: "localizacion", label: "Localización" },
];

const MENU_CORRALON = [
  { id: "inicio", label: "Inicio" },
  { id: "productos", label: "Mis Productos" },
  { id: "stock", label: "Stock" },
  { id: "pedidos", label: "Pedidos" },
  { id: "perfil", label: "Perfil" },
];

function vistaInicial(usuario) {
  return usuario?.rol === "proveedor" ? "productos" : "diseno";
}

export default function App() {
  const { favoritos, alternarFavorito } = useFavoritos();
  const { usuario, guardarSesion, cerrarSesion } = useAuth();
  const [vista, setVista] = useState(() => vistaInicial(usuario));

  function handleLogin(datos, recordar) {
    guardarSesion(datos, recordar);
    setVista(vistaInicial(datos));
  }

  if (!usuario) return <Auth onLogin={handleLogin} />;

  if (usuario.rol === "proveedor") {
    const actual = MENU_CORRALON.find((m) => m.id === vista);
    return (
      <Layout
        menu={MENU_CORRALON}
        vista={vista}
        onCambiarVista={setVista}
        etiqueta="Corralón"
        onCerrarSesion={cerrarSesion}
      >
        {vista === "productos" ? (
          <MisProductos usuario={usuario} />
        ) : (
          <>
            <h2>{actual ? actual.label : "Inicio"}</h2>
            <p className="mensaje">Hola, {usuario.nombre}. Próximamente.</p>
          </>
        )}
      </Layout>
    );
  }

  function contenido() {
    switch (vista) {
      case "proyectos":
        return <Proyectos />;
      case "insumos":
        return <Productos favoritos={favoritos} onAlternarFavorito={alternarFavorito} />;
      case "favoritos":
        return <Favoritos favoritos={favoritos} onAlternarFavorito={alternarFavorito} />;
      case "localizacion":
        return <Localizacion />;
      default:
        return <Diseno />;
    }
  }

  return (
    <Layout
      menu={MENU_CARPINTERO}
      vista={vista}
      onCambiarVista={setVista}
      onCerrarSesion={cerrarSesion}
    >
      {contenido()}
    </Layout>
  );
}
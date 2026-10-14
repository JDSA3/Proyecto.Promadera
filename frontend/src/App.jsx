import { useState } from "react";
import Layout from "./components/Layout.jsx";
import Diseno from "./components/Diseno.jsx";
import Proyectos from "./components/Proyectos.jsx";
import Productos from "./components/Productos.jsx";
import Favoritos from "./components/Favoritos.jsx";
import Localizacion from "./components/Localizacion.jsx";
import useFavoritos from "./useFavoritos.js";

const MENU_CARPINTERO = [
  { id: "diseno", label: "Diseño" },
  { id: "proyectos", label: "Mis Proyectos" },
  { id: "insumos", label: "Insumos" },
  { id: "favoritos", label: "Favoritos" },
  { id: "localizacion", label: "Localización" },
];

export default function App() {
  const { favoritos, alternarFavorito } = useFavoritos();
  const [vista, setVista] = useState("diseno");

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
    <Layout menu={MENU_CARPINTERO} vista={vista} onCambiarVista={setVista}>
      {contenido()}
    </Layout>
  );
}
import { useState } from "react";
import Layout from "./components/Layout.jsx";
import Auth from "./components/Auth.jsx";
import Diseno from "./components/Diseno.jsx";
import Proyectos from "./components/Proyectos.jsx";
import Productos from "./components/Productos.jsx";
import Favoritos from "./components/Favoritos.jsx";
import Localizacion from "./components/Localizacion.jsx";
import Carrito from "./components/Carrito.jsx";
import useFavoritos from "./useFavoritos.js";
import useCarrito from "./useCarrito.js";
import useProyectos from "./useProyectos.js";
import useAuth from "./useAuth.js";
import MisProductos from "./components/MisProductos.jsx";
import Stock from "./components/Stock.jsx";
import CorralonInicio from "./components/corralon/CorralonInicio.jsx";
import CorralonPedidos from "./components/corralon/CorralonPedidos.jsx";
import CorralonPerfil from "./components/corralon/CorralonPerfil.jsx";

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
  return usuario?.rol === "proveedor" ? "inicio" : "diseno";
}

export default function App() {
  const { favoritos, alternarFavorito } = useFavoritos();
  const { usuario, guardarSesion, cerrarSesion } = useAuth();
  const carrito = useCarrito(usuario?.id);
  const [vista, setVista] = useState(() => vistaInicial(usuario));
  const misProyectos = useProyectos(usuario?.id);
  const [proyectoAbierto, setProyectoAbierto] = useState(null);
  const cambiarVista = (id) => { setProyectoAbierto(null); setVista(id); };

  function handleLogin(datos, recordar) {
    guardarSesion(datos, recordar);
    setVista(vistaInicial(datos));
  }

  if (!usuario) return <Auth onLogin={handleLogin} />;

  if (usuario.rol === "proveedor") {
    function pantallaCorralon() {
      switch (vista) {
        case "productos":
          return <MisProductos usuario={usuario} />;
        case "stock":
          return <Stock usuario={usuario} />;
        case "pedidos":
          return <CorralonPedidos usuario={usuario} />;
        case "perfil":
          return <CorralonPerfil usuario={usuario} />;
        default:
          return <CorralonInicio usuario={usuario} onIr={setVista} />;
      }
    }

    return (
      <Layout
        menu={MENU_CORRALON}
        vista={vista}
        onCambiarVista={cambiarVista}
        etiqueta="Corralón"
        onCerrarSesion={cerrarSesion}
      >
        {pantallaCorralon()}
      </Layout>
    );
  }

  function contenido() {
    switch (vista) {
      case "proyectos":
        return <Proyectos proyectos={misProyectos.proyectos} onAbrir={(p) => { setProyectoAbierto(p); setVista("diseno"); }} onEliminar={misProyectos.eliminar} onIrADiseno={() => cambiarVista("diseno")} />;
      case "insumos":
        return (
          <Productos
            favoritos={favoritos}
            onAlternarFavorito={alternarFavorito}
            onAgregarAlCarrito={carrito.agregar}
          />
        );
      case "favoritos":
        return <Favoritos favoritos={favoritos} onAlternarFavorito={alternarFavorito} />;
      case "localizacion":
        return <Localizacion />;
      case "carrito":
        return (
          <Carrito
            usuario={usuario}
            carrito={carrito}
            onSeguirComprando={() => setVista("insumos")}
          />
        );
      default:
        return <Diseno key={proyectoAbierto?.id ?? "nuevo"} carrito={carrito} onIrAlCarrito={() => setVista("carrito")} proyectoInicial={proyectoAbierto} onGuardarProyecto={misProyectos.guardar} />;
    }
  }

  return (
    <Layout
      menu={[
        ...MENU_CARPINTERO,
        { id: "carrito", label: carrito.cantidadTotal > 0 ? `Carrito (${carrito.cantidadTotal})` : "Carrito" },
      ]}
      vista={vista}
      onCambiarVista={cambiarVista}
      onCerrarSesion={cerrarSesion}
    >
      {contenido()}
    </Layout>
  );
}



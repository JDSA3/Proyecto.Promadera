import { useEffect, useState } from "react";
import Layout from "./components/Layout.jsx";
import Auth from "./components/Auth.jsx";
import Diseno from "./components/Diseno.jsx";
import Proyectos from "./components/Proyectos.jsx";
import Productos from "./components/Productos.jsx";
import Favoritos from "./components/Favoritos.jsx";
import Localizacion from "./components/Localizacion.jsx";
import Carrito from "./components/Carrito.jsx";
import MisPedidos from "./components/MisPedidos.jsx";
import useFavoritos from "./useFavoritos.js";
import useCarrito from "./useCarrito.js";
import useProyectos from "./useProyectos.js";
import useAuth from "./useAuth.js";
import MisProductos from "./components/MisProductos.jsx";
import Stock from "./components/Stock.jsx";
import CorralonInicio from "./components/corralon/CorralonInicio.jsx";
import CorralonPedidos from "./components/corralon/CorralonPedidos.jsx";
import CorralonPerfil from "./components/corralon/CorralonPerfil.jsx";
import CorralonCompras from "./components/corralon/CorralonCompras.jsx";
import SolicitudCorralon from "./components/corralon/SolicitudCorralon.jsx";
import Comunidad from "./components/Comunidad.jsx";
import AdminPanel from "./components/admin/AdminPanel.jsx";
import { obtenerMiSolicitud } from "./apiCorralon.js";

const MENU_CARPINTERO = [
  { id: "diseno", label: "Diseño" },
  { id: "proyectos", label: "Mis Proyectos" },
  { id: "comunidad", label: "Comunidad" },
  { id: "insumos", label: "Insumos" },
  { id: "favoritos", label: "Favoritos" },
  { id: "localizacion", label: "Localización" },
];

const MENU_CORRALON = [
  { id: "inicio", label: "Inicio" },
  { id: "productos", label: "Mis Productos" },
  { id: "stock", label: "Stock" },
  { id: "pedidos", label: "Pedidos" },
  { id: "compras", label: "Compras" },
  { id: "perfil", label: "Perfil" },
];

const MENU_ADMIN = [
  { id: "resumen", label: "Resumen" },
  { id: "pedidos", label: "Pedidos" },
  { id: "productos", label: "Productos" },
  { id: "corralones", label: "Corralones" },
  { id: "carpinteros", label: "Carpinteros" },
  { id: "solicitudes", label: "Solicitudes" },
  { id: "usuarios", label: "Usuarios" },
];

function vistaInicial(usuario) {
  if (usuario?.rol === "admin") return "resumen";
  return usuario?.rol === "proveedor" ? "inicio" : "diseno";
}

export default function App() {
  const { favoritos, alternarFavorito } = useFavoritos();
  const { usuario, guardarSesion, cerrarSesion } = useAuth();
  const carrito = useCarrito(usuario?.id);
  const [vista, setVista] = useState(() => vistaInicial(usuario));
  const misProyectos = useProyectos(usuario?.id);
  const [proyectoAbierto, setProyectoAbierto] = useState(null);
  const [compraInicial, setCompraInicial] = useState(null); // producto elegido desde Stock
  // Estado de la cuenta del corralón ("pendiente", "aprobado", "rechazado"). null = todavía no se sabe.
  const [estadoCuenta, setEstadoCuenta] = useState(null);

  useEffect(() => {
    if (usuario?.rol !== "proveedor") return undefined;
    let vivo = true;
    setEstadoCuenta(null);
    obtenerMiSolicitud(usuario.id)
      .then((d) => {
        if (vivo) setEstadoCuenta(d.estado_cuenta);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [usuario?.id, usuario?.rol]);

  const cambiarVista = (id) => {
    setProyectoAbierto(null);
    setCompraInicial(null);
    setVista(id);
  };

  function handleLogin(datos, recordar) {
    guardarSesion(datos, recordar);
    setVista(vistaInicial(datos));
  }

  if (!usuario) return <Auth onLogin={handleLogin} />;

  if (usuario.rol === "admin") {
    return (
      <Layout
        menu={MENU_ADMIN}
        vista={vista}
        onCambiarVista={cambiarVista}
        etiqueta="Administrador"
        onCerrarSesion={cerrarSesion}
      >
        <AdminPanel vista={vista} usuario={usuario} />
      </Layout>
    );
  }

  if (usuario.rol === "proveedor") {
    // Mientras la cuenta no esté aprobada: menú bloqueado (no se puede desplegar) y solo la solicitud.
    // SolicitudCorralon avisa (onEstado) cuando cambia el estado, así el menú se habilita al aprobarse.
    if (estadoCuenta !== "aprobado") {
      return (
        <Layout
          menu={MENU_CORRALON}
          bloqueado
          vista={vista}
          onCambiarVista={cambiarVista}
          etiqueta="Corralón"
          onCerrarSesion={cerrarSesion}
        >
          <SolicitudCorralon usuario={usuario} onEstado={setEstadoCuenta} />
        </Layout>
      );
    }

    function pantallaCorralon() {
      switch (vista) {
        case "productos":
          return <MisProductos usuario={usuario} />;
        case "stock":
          return (
            <Stock
              usuario={usuario}
              onPedirReposicion={(p) => {
                setCompraInicial(p);
                setVista("compras");
              }}
            />
          );
        case "pedidos":
          return <CorralonPedidos usuario={usuario} />;
        case "compras":
          return (
            <CorralonCompras
              key={compraInicial?.id ?? "compras"}
              usuario={usuario}
              productoInicial={compraInicial}
            />
          );
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
        return (
          <Proyectos
            proyectos={misProyectos.proyectos}
            onAbrir={(p) => {
              setProyectoAbierto(p);
              setVista("diseno");
            }}
            onEliminar={misProyectos.eliminar}
            onIrADiseno={() => cambiarVista("diseno")}
          />
        );
      case "insumos":
        return (
          <Productos
            favoritos={favoritos}
            onAlternarFavorito={alternarFavorito}
            onAgregarAlCarrito={carrito.agregar}
          />
        );
      case "comunidad":
        return <Comunidad usuario={usuario} carrito={carrito} onIrAlCarrito={() => setVista("carrito")} />;
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
            onVerPedidos={() => setVista("mispedidos")}
          />
        );
      case "mispedidos":
        return <MisPedidos usuario={usuario} />;
      default:
        return (
          <Diseno
            key={proyectoAbierto?.id ?? "nuevo"}
            carrito={carrito}
            onIrAlCarrito={() => setVista("carrito")}
            proyectoInicial={proyectoAbierto}
            onGuardarProyecto={misProyectos.guardar}
          />
        );
    }
  }

  return (
    <Layout
      menu={[
        ...MENU_CARPINTERO,
        {
          id: "carrito",
          label: carrito.cantidadTotal > 0 ? `Carrito (${carrito.cantidadTotal})` : "Carrito",
        },
        { id: "mispedidos", label: "Mis Pedidos" },
      ]}
      vista={vista}
      onCambiarVista={cambiarVista}
      onCerrarSesion={cerrarSesion}
    >
      {contenido()}
    </Layout>
  );
}
import { useState } from "react";
import Header from "./components/Header.jsx";
import Inicio from "./components/Inicio.jsx";
import Diseno from "./components/Diseno.jsx";
import Proyectos from "./components/Proyectos.jsx";
import Productos from "./components/Productos.jsx";
import Favoritos from "./components/Favoritos.jsx";
import Localizacion from "./components/Localizacion.jsx";
import useFavoritos from "./useFavoritos.js";
import Contacto from "./components/Contacto.jsx";
import Auth from "./components/Auth.jsx";
import useAuth from "./useAuth.js";

export default function App() {
  const { favoritos, alternarFavorito } = useFavoritos();
  const { usuario, guardarSesion, cerrarSesion } = useAuth();
  const [mostrarCuenta, setMostrarCuenta] = useState(false);

  if (mostrarCuenta) {
    return (
      <>
        <Header onIrACuenta={() => setMostrarCuenta(true)} />
        <main>
          <section>
            <button
              type="button"
              className="btn-cancelar"
              onClick={() => setMostrarCuenta(false)}
            >
              ← Volver al sitio
            </button>
            <Auth
              usuario={usuario}
              onLogin={(datos) => {
                guardarSesion(datos);
                setMostrarCuenta(false);
              }}
              onLogout={cerrarSesion}
            />
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Header onIrACuenta={() => setMostrarCuenta(true)} />
      <main>
        <section>
          <Inicio />
          <Diseno />
          <Proyectos />
          <Productos favoritos={favoritos} onAlternarFavorito={alternarFavorito} />
          <Favoritos favoritos={favoritos} onAlternarFavorito={alternarFavorito} />
          <Contacto />
          <Localizacion />
        </section>
      </main>
    </>
  );
}
import Header from "./components/Header.jsx";
import Inicio from "./components/Inicio.jsx";
import Diseno from "./components/Diseno.jsx";
import Proyectos from "./components/Proyectos.jsx";
import Productos from "./components/Productos.jsx";
import Favoritos from "./components/Favoritos.jsx";
import Localizacion from "./components/Localizacion.jsx";

export default function App() {
  return (
    <>
      <Header />
      <main>
        <section>
          <Inicio />
          <Diseno />
          <Proyectos />
          <Productos />
          <Favoritos />
          <Localizacion />
        </section>
      </main>
    </>
  );
}

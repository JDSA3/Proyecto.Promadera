export default function Header({ onIrACuenta }) {
  return (
    <header>
      <h1>Bienvenidos a Pro Madera</h1>
      <img src="/logo.png" alt="Logo" width="100" />
      <nav>
        <a href="#home">Inicio</a>
        <button type="button" className="link-nav" onClick={onIrACuenta}>
          Mi Cuenta
        </button>
        <a href="#diseño">Diseño</a>
        <a href="#proyectos">Mis Proyectos</a>
        <a href="#insumos">Productos</a>
        <a href="#favoritos">Favoritos</a>
        <a href="#contacto">Contacto</a>
        <a href="#localizacion">Localizacion</a>
      </nav>
    </header>
  );
}

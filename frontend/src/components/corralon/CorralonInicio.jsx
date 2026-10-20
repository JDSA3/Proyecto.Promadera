import useProductosCorralon, { STOCK_MINIMO } from "./useProductosCorralon.js";

const ACCESOS = [
  { id: "productos", titulo: "Subir productos", texto: "Agregá nuevos productos a tu catálogo." },
  { id: "productos", titulo: "Ver productos", texto: "Editá o eliminá productos existentes." },
  { id: "stock", titulo: "Gestionar stock", texto: "Actualizá cantidades y controlá faltantes." },
  { id: "pedidos", titulo: "Ver pedidos", texto: "Revisá los pedidos recibidos." },
];

export default function CorralonInicio({ usuario, onIr }) {
  const { productos, error } = useProductosCorralon(usuario.id);
  const unidades = productos?.reduce((s, p) => s + p.stock, 0) ?? "—";
  const bajos = productos?.filter((p) => p.stock <= STOCK_MINIMO).length ?? "—";

  return (
    <section className="cr-pagina">
      <div className="cr-cabecera">
        <div>
          <h2>Hola, {usuario.nombre} 👋</h2>
          <p className="cr-sub">Gestioná tus productos, stock y pedidos.</p>
        </div>
      </div>
      {error && <p className="mensaje">No se pudo conectar con el servidor.</p>}

      <div className="cr-kpis">
        <div className="cr-kpi"><div className="cr-kpi-num">{productos?.length ?? "—"}</div><p className="cr-kpi-txt">Productos publicados</p></div>
        <div className="cr-kpi"><div className="cr-kpi-num">{unidades}</div><p className="cr-kpi-txt">Unidades en stock</p></div>
        <div className="cr-kpi alerta"><div className="cr-kpi-num">{bajos}</div><p className="cr-kpi-txt">Con stock bajo</p><p className="cr-kpi-nota">Umbral: {STOCK_MINIMO} unidades</p></div>
      </div>

      <h3 className="cr-subtitulo">Accesos rápidos</h3>
      <div className="cr-accesos">
        {ACCESOS.map((a) => (
          <button key={a.titulo} type="button" className="cr-acceso" onClick={() => onIr(a.id)}>
            <strong>{a.titulo}</strong><span>{a.texto}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
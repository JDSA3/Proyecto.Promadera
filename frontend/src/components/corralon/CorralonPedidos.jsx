import { useState } from "react";

const FILTROS = ["Todos", "En proceso", "Enviados", "Pendientes"];

// Cuando exista GET /pedidos (feature/pedidos-backend), reemplazar [] por los datos de la API.
export default function CorralonPedidos() {
  const [filtro, setFiltro] = useState("Todos");
  const pedidos = [];

  return (
    <section className="cr-pagina">
      <div className="cr-cabecera">
        <div>
          <h2>Pedidos</h2>
          <p className="cr-sub">Revisá el estado de tus pedidos y gestionalos.</p>
        </div>
      </div>

      <div className="cr-pills">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            className={f === filtro ? "cr-pill activo" : "cr-pill"}
            onClick={() => setFiltro(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="cr-tabla-wrap">
        <table className="cr-tabla">
          <thead>
            <tr>
              <th>N° Pedido</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 && (
              <tr><td colSpan="6" className="cr-vacio">Todavía no recibiste pedidos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

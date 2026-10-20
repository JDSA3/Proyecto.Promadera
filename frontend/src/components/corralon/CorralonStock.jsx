import { useState } from "react";
import { editarProducto } from "../../api.js";
import useProductosCorralon, { estadoStock, STOCK_MINIMO } from "./useProductosCorralon.js";

export default function CorralonStock({ usuario }) {
  const { productos, error, recargar } = useProductosCorralon(usuario.id);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null); // { id, valor }
  const [aviso, setAviso] = useState("");

  async function guardar(p) {
    const stock = Number(editando.valor);
    if (!Number.isInteger(stock) || stock < 0) {
      setAviso("El stock debe ser un número entero mayor o igual a 0.");
      return;
    }
    try {
      await editarProducto(p.id, { stock });
      setEditando(null);
      setAviso(`Stock de "${p.nombre}" actualizado.`);
      recargar();
    } catch {
      setAviso("No se pudo actualizar el stock. Probá de nuevo.");
    }
  }

  const lista = (productos ?? []).filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <section className="cr-pagina">
      <div className="cr-cabecera">
        <div>
          <h2>Control de stock</h2>
          <p className="cr-sub">Revisá y actualizá el stock de tus productos.</p>
        </div>
      </div>

      <div className="cr-filtros">
        <input
          type="search"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {aviso && <p className="mensaje-exito" role="status">{aviso}</p>}
      {error && <p className="mensaje">No se pudo conectar con el servidor.</p>}
      {productos === null && !error && (
        <>
          <div className="cr-esqueleto" />
          <div className="cr-esqueleto" />
        </>
      )}

      {productos && (
        <div className="cr-tabla-wrap">
          <table className="cr-tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Stock actual</th>
                <th>Stock mínimo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && (
                <tr><td colSpan="6" className="cr-vacio">No hay productos para mostrar.</td></tr>
              )}
              {lista.map((p) => {
                const est = estadoStock(p.stock);
                const enEdicion = editando?.id === p.id;
                return (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td><span className="cr-chip">{p.categoria.nombre}</span></td>
                    <td>
                      {enEdicion ? (
                        <input
                          className="cr-input-mini"
                          type="number"
                          min="0"
                          autoFocus
                          value={editando.valor}
                          onChange={(e) => setEditando({ id: p.id, valor: e.target.value })}
                        />
                      ) : (
                        p.stock
                      )}
                    </td>
                    <td>{STOCK_MINIMO}</td>
                    <td className={`cr-estado ${est.clase}`}>{est.texto}</td>
                    <td className="cr-acciones">
                      {enEdicion ? (
                        <>
                          <button type="button" className="cr-btn-icono" onClick={() => guardar(p)}>
                            Guardar
                          </button>
                          <button type="button" className="cr-btn-icono" onClick={() => setEditando(null)}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="cr-btn-icono"
                          aria-label={`Editar stock de ${p.nombre}`}
                          onClick={() => {
                            setAviso("");
                            setEditando({ id: p.id, valor: p.stock });
                          }}
                        >
                          ✎ Editar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
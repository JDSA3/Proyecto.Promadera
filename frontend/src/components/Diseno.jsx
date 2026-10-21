import { useEffect, useMemo, useState } from "react";
import { obtenerProductos } from "../api.js";
import { DISENOS, ACABADOS, medidasPorDefecto } from "../data/disenos.js";
import { calcularPresupuesto } from "../presupuesto.js";
import "./Carrito.css";
import "./Diseno.css";

const dinero = (n) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const cm = (n) => `${Number(n).toFixed(1).replace(/\.0$/, "")} cm`;

export default function Diseno({ carrito, onIrAlCarrito }) {
  const [productos, setProductos] = useState(null); // null = cargando
  const [error, setError] = useState(false);
  const [disenoId, setDisenoId] = useState(DISENOS[0].id);
  const [medidas, setMedidas] = useState(() => medidasPorDefecto(DISENOS[0]));
  const [acabado, setAcabado] = useState(ACABADOS[0].id);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    obtenerProductos()
      .then((datos) => setProductos(datos.filter((p) => p.activo)))
      .catch((err) => {
        console.error("No se pudieron cargar los productos:", err);
        setError(true);
      });
  }, []);

  const diseno = DISENOS.find((d) => d.id === disenoId);

  const resultado = useMemo(
    () => (productos ? calcularPresupuesto(diseno, productos, { medidas, acabado }) : null),
    [diseno, productos, medidas, acabado]
  );

  function elegirDiseno(d) {
    setDisenoId(d.id);
    setMedidas(medidasPorDefecto(d));
    setAviso("");
  }

  function cambiarMedida(clave, valor) {
    setMedidas((m) => ({ ...m, [clave]: valor }));
    setAviso("");
  }

  function agregarAlCarrito() {
    resultado.items.forEach((i) => carrito.agregar(i.producto, i.cantidad));
    setAviso(`Se agregaron ${resultado.items.length} materiales al carrito.`);
  }

  return (
    <section className="diseno-pagina">
      <h2>Diseño</h2>
      <p className="cr-sub">Elegí un mueble, ajustá las medidas y mirá cuánto material necesitás.</p>

      <div className="diseno-selector">
        {DISENOS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={d.id === disenoId ? "diseno-opcion activo" : "diseno-opcion"}
            onClick={() => elegirDiseno(d)}
          >
            <strong>{d.nombre}</strong>
            <span>{d.descripcion}</span>
          </button>
        ))}
      </div>

      <div className="diseno-panel">
        <h3>Medidas y acabado</h3>
        <div className="diseno-medidas">
          {diseno.medidas.map((m) => (
            <div className="diseno-campo" key={m.clave}>
              <label htmlFor={`medida-${m.clave}`}>{m.etiqueta}</label>
              <input
                id={`medida-${m.clave}`}
                type="number"
                min={m.min}
                max={m.max}
                step={m.entero ? 1 : 5}
                value={medidas[m.clave]}
                onChange={(e) => cambiarMedida(m.clave, e.target.value)}
              />
              <small>
                {m.min} a {m.max}
                {m.entero ? "" : " cm"}
              </small>
            </div>
          ))}
          <div className="diseno-campo">
            <label htmlFor="acabado">Acabado</label>
            <select id="acabado" value={acabado} onChange={(e) => setAcabado(e.target.value)}>
              {ACABADOS.map((a) => (
                <option key={a.id} value={a.id}>{a.etiqueta}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <p className="mensaje">No se pudo conectar con el servidor. Verificá que la API esté encendida.</p>}
      {productos === null && !error && (
        <>
          <div className="cr-esqueleto" />
          <div className="cr-esqueleto" />
        </>
      )}

      {resultado && (
        <>
          {(resultado.avisos.length > 0 || resultado.faltantes.length > 0) && (
            <div className="diseno-avisos" role="status">
              {resultado.avisos.map((a) => <p key={a}>⚠ {a}</p>)}
              {resultado.faltantes.map((f) => (
                <p key={f.material}>⚠ Falta en el catálogo: {f.material}. {f.motivo}</p>
              ))}
            </div>
          )}

          <div className="diseno-panel">
            <h3>Despiece</h3>
            <div className="cr-tabla-wrap">
              <table className="cr-tabla">
                <thead>
                  <tr><th>Pieza</th><th>Largo</th><th>Ancho</th><th>Espesor</th><th>Cantidad</th></tr>
                </thead>
                <tbody>
                  {resultado.piezas.map((p) => (
                    <tr key={p.nombre}>
                      <td>{p.nombre}</td>
                      <td>{cm(p.largo)}</td>
                      <td>{cm(p.ancho)}</td>
                      <td>{p.espesor_mm} mm</td>
                      <td>{p.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="diseno-panel">
            <h3>Materiales y presupuesto</h3>
            <div className="cr-tabla-wrap">
              <table className="cr-tabla">
                <thead>
                  <tr><th>Material</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr>
                </thead>
                <tbody>
                  {resultado.items.length === 0 && (
                    <tr><td colSpan="4" className="cr-vacio">No se encontraron materiales en el catálogo.</td></tr>
                  )}
                  {resultado.items.map((i) => (
                    <tr key={i.producto.id}>
                      <td>
                        {i.producto.nombre}
                        {i.detalle && <span className="diseno-detalle">{i.detalle}</span>}
                      </td>
                      <td>{i.cantidad}</td>
                      <td>{dinero(i.producto.precio)}</td>
                      <td>{dinero(i.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="carrito-resumen">
              <span className="carrito-total">Total: {dinero(resultado.total)}</span>
              <div className="carrito-acciones">
                {aviso && (
                  <button type="button" className="btn-secundario" onClick={onIrAlCarrito}>
                    Ir al carrito
                  </button>
                )}
                <button
                  type="button"
                  className="btn-tan"
                  disabled={resultado.items.length === 0}
                  onClick={agregarAlCarrito}
                >
                  🛒 Agregar materiales al carrito
                </button>
              </div>
            </div>
            {aviso && <p className="mensaje-exito" role="status">{aviso}</p>}
          </div>
        </>
      )}
    </section>
  );
}

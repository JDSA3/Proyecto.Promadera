import { useEffect, useRef, useState } from "react";
import BotonCarrito from "./BotonCarrito.jsx";
import {
  UNIDADES,
  cortesPorPieza,
  formatearLargo,
  piezasNecesarias,
  precioCorte,
} from "../cortes.js";
import "./CorteMedida.css";

const dinero = (n) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const redondear = (n) => Math.round(n * 100) / 100;
const aTexto = (n) => String(redondear(n)).replace(".", ",");

// Compra de una pieza larga: entera o cortada a medida (slider en m, cm o mm).
// onAgregar es carrito.agregar(producto, cantidad, corte).
export default function CorteMedida({ producto, onAgregar }) {
  const [modo, setModo] = useState("entera"); // "entera" | "medida"
  const [unidadId, setUnidadId] = useState("cm");
  const [largoCm, setLargoCm] = useState(Math.min(100, producto.largo_cm));
  const [texto, setTexto] = useState(null); // null = no se está escribiendo
  const [cortes, setCortes] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const temporizador = useRef(null);

  const unidad = UNIDADES.find((u) => u.id === unidadId);
  const porPieza = cortesPorPieza(producto, largoCm);
  const maxCortes = porPieza * producto.stock;
  const cortesOk = Math.max(1, Math.min(cortes, maxCortes || 1));
  const precioUnitario = precioCorte(producto, largoCm);
  const piezas = piezasNecesarias(producto, largoCm, cortesOk);
  const sobrante = redondear(producto.largo_cm - porPieza * largoCm);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  // Mientras se escribe se muestra lo tipeado; si no, el largo en la unidad elegida
  const valorCampo = texto ?? aTexto(largoCm / unidad.factor);

  const limitar = (cm) => Math.max(1, Math.min(redondear(cm), producto.largo_cm));

  function escribir(e) {
    setTexto(e.target.value);
    const valor = parseFloat(e.target.value.replace(",", "."));
    if (!Number.isNaN(valor) && valor > 0) setLargoCm(limitar(valor * unidad.factor));
  }

  function agregar() {
    onAgregar(producto, cortesOk, { largoCm, precio: precioUnitario, stockMaximo: maxCortes });
    setAgregado(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAgregado(false), 1800);
  }

  if (producto.stock <= 0) {
    return <p className="cm-sin-stock">Sin stock</p>;
  }

  return (
    <div className="cm">
      <div className="cm-modos" role="group" aria-label="Cómo querés comprarlo">
        <button type="button" className={modo === "entera" ? "cm-modo activo" : "cm-modo"} onClick={() => setModo("entera")}>
          Pieza entera ({formatearLargo(producto.largo_cm)})
        </button>
        <button type="button" className={modo === "medida" ? "cm-modo activo" : "cm-modo"} onClick={() => setModo("medida")}>
          Cortar a medida
        </button>
      </div>

      {modo === "entera" ? (
        <BotonCarrito producto={producto} onAgregar={(p) => onAgregar(p, 1)} />
      ) : (
        <div className="cm-panel">
          <div className="cm-unidades" role="group" aria-label="Unidad de medida">
            {UNIDADES.map((u) => (
              <button key={u.id} type="button" className={u.id === unidadId ? "cm-unidad activo" : "cm-unidad"} onClick={() => {
                  setTexto(null);
                  setUnidadId(u.id);
                }}>
                {u.etiqueta}
              </button>
            ))}
          </div>

          <label className="cm-campo">
            Largo del corte
            <input
              className="cm-slider"
              type="range"
              min="1"
              max={producto.largo_cm}
              step="0.1"
              value={largoCm}
              onChange={(e) => {
                setTexto(null);
                setLargoCm(limitar(Number(e.target.value)));
              }}
              aria-label="Largo del corte"
            />
          </label>

          <div className="cm-fila">
            <label className="cm-campo cm-numero">
              Largo ({unidad.etiqueta})
              <input
                type="text"
                inputMode="decimal"
                value={valorCampo}
                onChange={escribir}
                onBlur={() => setTexto(null)}
                aria-label={`Largo en ${unidad.etiqueta}`}
              />
            </label>
            <label className="cm-campo cm-numero">
              Cantidad de cortes
              <input
                type="number"
                min="1"
                max={maxCortes}
                value={cortesOk}
                onChange={(e) => setCortes(Math.max(1, Math.min(Number(e.target.value) || 1, maxCortes)))}
                aria-label="Cantidad de cortes"
              />
            </label>
          </div>

          <p className="cm-detalle">
            Cada corte de <strong>{formatearLargo(largoCm)}</strong> cuesta <strong>{dinero(precioUnitario)}</strong>.
            De cada pieza de {formatearLargo(producto.largo_cm)} salen {porPieza}
            {porPieza === 1 ? " corte" : " cortes"}
            {sobrante > 0 ? ` y sobran ${formatearLargo(sobrante)}` : ""}.
          </p>
          <p className="cm-total">
            Total: {dinero(redondear(precioUnitario * cortesOk))}
            <span> · usa {piezas} {piezas === 1 ? "pieza" : "piezas"} de stock</span>
          </p>

          <button type="button" className="btn-tan" onClick={agregar} aria-live="polite">
            {agregado ? "✓ Agregado al carrito" : "🛒 Agregar corte al carrito"}
          </button>
        </div>
      )}
    </div>
  );
}

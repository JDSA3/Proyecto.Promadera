import { useState } from "react";

export const AMBIENTES = ["Sala", "Armarios", "Hogar", "Exteriores"];

export default function GuardarProyecto({ nombreInicial = "", ambienteInicial = AMBIENTES[0], onGuardar }) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [ambiente, setAmbiente] = useState(ambienteInicial);
  const [guardado, setGuardado] = useState(false);

  function guardar() {
    onGuardar(nombre.trim(), ambiente);
    setGuardado(true);
  }

  return (
    <div className="diseno-guardar">
      <h3>Guardar como proyecto</h3>
      <div className="diseno-guardar-fila">
        <div className="diseno-campo">
          <label htmlFor="proyecto-nombre">Nombre</label>
          <input
            id="proyecto-nombre"
            type="text"
            maxLength={60}
            placeholder="Ej: Mesa del living"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setGuardado(false);
            }}
          />
        </div>
        <div className="diseno-campo">
          <label htmlFor="proyecto-ambiente">Ambiente</label>
          <select id="proyecto-ambiente" value={ambiente} onChange={(e) => setAmbiente(e.target.value)}>
            {AMBIENTES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-tan" disabled={nombre.trim().length < 2} onClick={guardar}>
          Guardar proyecto
        </button>
      </div>
      {guardado && (
        <p className="mensaje-exito" role="status">
          Proyecto guardado. Lo ves en Mis Proyectos.
        </p>
      )}
    </div>
  );
}

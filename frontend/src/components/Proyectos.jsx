import { useState } from "react";
import { DISENOS, ACABADOS } from "../data/disenos.js";
import { AMBIENTES } from "./GuardarProyecto.jsx";
import "./Diseno.css";

export default function Proyectos({ proyectos, onAbrir, onEliminar, onIrADiseno }) {
  const [filtro, setFiltro] = useState("Todos");
  const visibles = proyectos.filter((p) => filtro === "Todos" || p.ambiente === filtro);

  function medidasTexto(p, diseno) {
    return diseno.medidas
      .map((m) => `${m.etiqueta} ${p.medidas[m.clave]}${m.entero ? "" : " cm"}`)
      .join(" · ");
  }

  function eliminar(p) {
    if (window.confirm(`¿Eliminar el proyecto "${p.nombre}"?`)) onEliminar(p.id);
  }

  return (
    <section className="diseno-pagina" id="proyectos">
      <h2>Mis Proyectos</h2>
      <p className="cr-sub">Tus diseños guardados. Abrilos para retomarlos o agregar sus materiales al carrito.</p>

      <div className="cr-pills">
        {["Todos", ...AMBIENTES].map((a) => (
          <button
            key={a}
            type="button"
            className={a === filtro ? "cr-pill activo" : "cr-pill"}
            onClick={() => setFiltro(a)}
          >
            {a}
          </button>
        ))}
      </div>

      {proyectos.length === 0 && (
        <>
          <p className="mensaje">Todavía no guardaste proyectos. Armá un diseño y tocá "Guardar proyecto".</p>
          <button type="button" className="btn-tan" onClick={onIrADiseno}>Ir a Diseño</button>
        </>
      )}

      {proyectos.length > 0 && visibles.length === 0 && (
        <p className="mensaje">No tenés proyectos en "{filtro}".</p>
      )}

      <div className="proyectos-grilla">
        {visibles.map((p) => {
          const diseno = DISENOS.find((d) => d.id === p.disenoId);
          if (!diseno) return null;
          const acabado = ACABADOS.find((a) => a.id === p.acabado);
          return (
            <article className="proyecto-card" key={p.id}>
              <span className="cr-chip">{p.ambiente}</span>
              <h3>{p.nombre}</h3>
              <p>{diseno.nombre} · {acabado ? acabado.etiqueta : p.acabado}</p>
              <p>{medidasTexto(p, diseno)}</p>
              <p>Guardado el {new Date(p.creado).toLocaleDateString("es-AR")}</p>
              <div className="proyecto-acciones">
                <button type="button" className="btn-tan" onClick={() => onAbrir(p)}>Abrir en Diseño</button>
                <button type="button" className="btn-secundario" onClick={() => eliminar(p)}>Eliminar</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

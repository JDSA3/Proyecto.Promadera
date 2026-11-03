import "./Paginador.css";

// Números a mostrar: la primera, la última, la actual y sus vecinas, con "…" en los saltos.
function numerosVisibles(actual, total) {
  const base = new Set([1, total, actual - 1, actual, actual + 1]);
  const lista = [...base].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const salida = [];
  lista.forEach((n, i) => {
    if (i > 0 && n - lista[i - 1] > 1) salida.push(`salto-${n}`);
    salida.push(n);
  });
  return salida;
}

export default function Paginador({ pagina, totalPaginas, onCambiar }) {
  if (totalPaginas <= 1) return null;

  return (
    <nav className="paginador" aria-label="Paginación">
      <button
        type="button"
        className="paginador-btn"
        disabled={pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
      >
        Anterior
      </button>

      {numerosVisibles(pagina, totalPaginas).map((n) =>
        typeof n === "string" ? (
          <span key={n} className="paginador-puntos">…</span>
        ) : (
          <button
            key={n}
            type="button"
            className={n === pagina ? "paginador-btn activo" : "paginador-btn"}
            aria-current={n === pagina ? "page" : undefined}
            onClick={() => onCambiar(n)}
          >
            {n}
          </button>
        )
      )}

      <button
        type="button"
        className="paginador-btn"
        disabled={pagina >= totalPaginas}
        onClick={() => onCambiar(pagina + 1)}
      >
        Siguiente
      </button>
    </nav>
  );
}

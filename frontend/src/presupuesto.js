// Cálculo de materiales y presupuesto a partir de un diseño y del catálogo.
//
// Uso:
//   const r = calcularPresupuesto(diseno, productos, { medidas, acabado });
//   r.items     -> [{ producto, cantidad, subtotal, detalle }]
//   r.total     -> suma de subtotales
//   r.piezas    -> lista de piezas del mueble
//   r.faltantes -> materiales que no se encontraron en el catálogo
//   r.avisos    -> advertencias (pieza más grande que la placa, sin stock, etc.)
//
// "productos" es el arreglo que devuelve GET /productos (con largo_cm,
// ancho_cm y espesor_mm).

import { medidasPorDefecto } from "./data/disenos";

const DESPERDICIO_PLACA = 1.15; // 15 % extra por cortes
const DESPERDICIO_TAPACANTO = 1.1; // 10 % extra
const PORCION_CANTOS_VISIBLES = 0.5; // se estima que la mitad del perímetro lleva tapacanto

const normalizar = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const esMadera = (p) => normalizar(p.categoria?.nombre).includes("madera");

// Elige el más barato entre los que tienen stock; si ninguno tiene, el más barato.
function elegirMasBarato(candidatos) {
  const ordenados = [...candidatos].sort((a, b) => a.precio - b.precio);
  return ordenados.find((p) => p.stock > 0) || ordenados[0] || null;
}

function buscarPlaca(productos, espesor_mm, acabado, texto) {
  const coincide = (p) =>
    esMadera(p) &&
    normalizar(p.nombre).includes(texto) &&
    Number(p.espesor_mm) === Number(espesor_mm) &&
    p.largo_cm &&
    p.ancho_cm;
  const base = productos.filter(coincide);
  if (acabado) {
    const conAcabado = base.filter((p) => normalizar(p.nombre).includes(normalizar(acabado)));
    return elegirMasBarato(conAcabado);
  }
  return elegirMasBarato(base);
}

const ACABADO_A_TAPACANTO = { blanca: "blanco", roble: "roble" };

function buscarTapacanto(productos, acabado) {
  const pvc = productos.filter(
    (p) => normalizar(p.nombre).includes("tapacanto pvc") && p.largo_cm
  );
  const color = ACABADO_A_TAPACANTO[acabado];
  const igual = color ? pvc.filter((p) => normalizar(p.nombre).includes(color)) : [];
  return elegirMasBarato(igual.length ? igual : pvc);
}

function buscarPorTexto(productos, texto) {
  const t = normalizar(texto);
  return elegirMasBarato(productos.filter((p) => normalizar(p.nombre).includes(t)));
}

// Ajusta las medidas al rango permitido y completa las que falten.
export function normalizarMedidas(diseno, medidas = {}) {
  const resultado = {};
  for (const m of diseno.medidas) {
    let v = Number(medidas[m.clave]);
    if (!Number.isFinite(v)) v = m.defecto;
    v = Math.min(Math.max(v, m.min), m.max);
    resultado[m.clave] = m.entero ? Math.round(v) : v;
  }
  return resultado;
}

export function calcularPresupuesto(diseno, productos, opciones = {}) {
  const medidas = normalizarMedidas(diseno, opciones.medidas || medidasPorDefecto(diseno));
  const acabado = opciones.acabado || "blanca";
  const piezas = diseno.piezas(medidas);

  const items = [];
  const faltantes = [];
  const avisos = [];

  const agregar = (producto, cantidad, detalle) => {
    if (producto.stock < cantidad) {
      avisos.push(`Stock insuficiente de "${producto.nombre}": hay ${producto.stock} y se necesitan ${cantidad}.`);
    }
    items.push({
      producto,
      cantidad,
      subtotal: Math.round(producto.precio * cantidad * 100) / 100,
      detalle,
    });
  };

  // 1) Placas: se agrupan las piezas por espesor y se calcula cuántas placas hacen falta.
  const porEspesor = new Map();
  for (const pieza of piezas) {
    const lista = porEspesor.get(pieza.espesor_mm) || [];
    lista.push(pieza);
    porEspesor.set(pieza.espesor_mm, lista);
  }

  let perimetroCm = 0;

  for (const [espesor, lista] of porEspesor) {
    const esFondo = espesor <= 5;
    const placa = esFondo
      ? buscarPlaca(productos, espesor, null, "hardboard")
      : buscarPlaca(productos, espesor, acabado, "melamina");

    if (!placa) {
      faltantes.push({
        material: esFondo ? `Fondo hardboard ${espesor} mm` : `Placa melamina ${espesor} mm (${acabado})`,
        motivo: "No hay un producto con ese material y espesor en el catálogo.",
      });
      continue;
    }

    // Una pieza que no entra en la placa en ninguna orientación no se puede cortar.
    const placaMax = Math.max(placa.largo_cm, placa.ancho_cm);
    const placaMin = Math.min(placa.largo_cm, placa.ancho_cm);
    for (const p of lista) {
      const pMax = Math.max(p.largo, p.ancho);
      const pMin = Math.min(p.largo, p.ancho);
      if (pMax > placaMax || pMin > placaMin) {
        avisos.push(`La pieza "${p.nombre}" (${p.largo.toFixed(0)}x${p.ancho.toFixed(0)} cm) no entra en una placa de ${placa.largo_cm}x${placa.ancho_cm} cm.`);
      }
    }

    const areaPiezas = lista.reduce((s, p) => s + p.largo * p.ancho * p.cantidad, 0);
    const areaPlaca = placa.largo_cm * placa.ancho_cm;
    const cantidad = Math.max(1, Math.ceil((areaPiezas * DESPERDICIO_PLACA) / areaPlaca));

    agregar(
      placa,
      cantidad,
      `${lista.map((p) => `${p.cantidad} ${p.nombre.toLowerCase()}`).join(", ")} (con 15 % de desperdicio)`
    );

    if (!esFondo) {
      perimetroCm += lista.reduce((s, p) => s + 2 * (p.largo + p.ancho) * p.cantidad, 0);
    }
  }

  // 2) Tapacanto.
  const metros = ((perimetroCm * PORCION_CANTOS_VISIBLES) / 100) * DESPERDICIO_TAPACANTO;
  if (metros > 0) {
    const tapacanto = buscarTapacanto(productos, acabado);
    if (!tapacanto) {
      faltantes.push({ material: "Tapacanto PVC", motivo: "No hay tapacanto en el catálogo." });
    } else {
      const metrosRollo = tapacanto.largo_cm / 100;
      const rollos = Math.max(1, Math.ceil(metros / metrosRollo));
      agregar(tapacanto, rollos, `Se estiman ${metros.toFixed(1)} m de tapacanto`);
    }
  }

  // 3) Herrajes y otros insumos.
  for (const h of diseno.herrajes(medidas)) {
    const producto = buscarPorTexto(productos, h.texto);
    if (!producto) {
      faltantes.push({ material: h.texto, motivo: "No hay un producto parecido en el catálogo." });
      continue;
    }
    agregar(producto, h.cantidad, h.nota || "");
  }

  const total = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;

  return { medidas, acabado, piezas, items, total, faltantes, avisos };
}

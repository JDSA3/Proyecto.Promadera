// Diseños estándar de ProMadera.
// Cada diseño trae medidas por defecto (en cm) y sabe calcular sus piezas,
// herrajes y metros de tapacanto según las medidas elegidas.
//
// Espesores: el tablero principal es de 18 mm y el fondo de 3 mm.

const ESP_TABLERO = 18; // mm
const ESP_FONDO = 3; // mm
const t = ESP_TABLERO / 10; // espesor del tablero en cm (1.8)

export const ACABADOS = [
  { id: "blanca", etiqueta: "Blanco" },
  { id: "roble", etiqueta: "Roble" },
  { id: "wengue", etiqueta: "Wengue" },
  { id: "gris grafito", etiqueta: "Gris grafito" },
];

export const DISENOS = [
  {
    id: "mesa-ratona",
    nombre: "Mesa ratona",
    descripcion: "Mesa baja con tapa, dos laterales y un estante inferior.",
    medidas: [
      { clave: "largo", etiqueta: "Largo", min: 60, max: 150, defecto: 100 },
      { clave: "ancho", etiqueta: "Ancho", min: 40, max: 80, defecto: 50 },
      { clave: "alto", etiqueta: "Alto", min: 30, max: 55, defecto: 40 },
    ],
    // Cada pieza: nombre, largo y ancho en cm, cantidad, espesor en mm.
    piezas: ({ largo, ancho, alto }) => [
      { nombre: "Tapa", largo, ancho, cantidad: 1, espesor_mm: ESP_TABLERO },
      { nombre: "Lateral", largo: alto - t, ancho, cantidad: 2, espesor_mm: ESP_TABLERO },
      { nombre: "Estante inferior", largo: largo - 2 * t, ancho, cantidad: 1, espesor_mm: ESP_TABLERO },
    ],
    herrajes: () => [
      { texto: "Tornillo para aglomerado", cantidad: 1, nota: "Caja de 100" },
    ],
  },
  {
    id: "mueble-bajo",
    nombre: "Mueble bajo con puertas",
    descripcion: "Mueble de guardado con estante interior, dos puertas y fondo.",
    medidas: [
      { clave: "ancho", etiqueta: "Ancho", min: 60, max: 180, defecto: 120 },
      { clave: "alto", etiqueta: "Alto", min: 60, max: 100, defecto: 80 },
      { clave: "profundidad", etiqueta: "Profundidad", min: 30, max: 60, defecto: 40 },
    ],
    piezas: ({ ancho, alto, profundidad }) => [
      { nombre: "Lateral", largo: alto, ancho: profundidad, cantidad: 2, espesor_mm: ESP_TABLERO },
      { nombre: "Base", largo: ancho - 2 * t, ancho: profundidad, cantidad: 1, espesor_mm: ESP_TABLERO },
      { nombre: "Techo", largo: ancho - 2 * t, ancho: profundidad, cantidad: 1, espesor_mm: ESP_TABLERO },
      { nombre: "Estante interior", largo: ancho - 2 * t, ancho: profundidad - 2, cantidad: 1, espesor_mm: ESP_TABLERO },
      { nombre: "Puerta", largo: alto, ancho: ancho / 2, cantidad: 2, espesor_mm: ESP_TABLERO },
      { nombre: "Fondo", largo: alto, ancho, cantidad: 1, espesor_mm: ESP_FONDO },
    ],
    herrajes: () => [
      { texto: "Bisagra cierre suave", cantidad: 4 },
      { texto: "Tirador barra", cantidad: 2 },
      { texto: "Soporte de estante", cantidad: 1, nota: "Par" },
      { texto: "Tornillo para aglomerado", cantidad: 1, nota: "Caja de 100" },
    ],
  },
  {
    id: "biblioteca",
    nombre: "Biblioteca",
    descripcion: "Biblioteca abierta con estantes regulables y fondo.",
    medidas: [
      { clave: "ancho", etiqueta: "Ancho", min: 50, max: 120, defecto: 80 },
      { clave: "alto", etiqueta: "Alto", min: 100, max: 220, defecto: 180 },
      { clave: "profundidad", etiqueta: "Profundidad", min: 20, max: 40, defecto: 30 },
      { clave: "estantes", etiqueta: "Estantes", min: 2, max: 8, defecto: 4, entero: true, unidad: "" },
    ],
    piezas: ({ ancho, alto, profundidad, estantes }) => [
      { nombre: "Lateral", largo: alto, ancho: profundidad, cantidad: 2, espesor_mm: ESP_TABLERO },
      { nombre: "Base y techo", largo: ancho - 2 * t, ancho: profundidad, cantidad: 2, espesor_mm: ESP_TABLERO },
      { nombre: "Estante", largo: ancho - 2 * t, ancho: profundidad - 1, cantidad: estantes, espesor_mm: ESP_TABLERO },
      { nombre: "Fondo", largo: alto, ancho, cantidad: 1, espesor_mm: ESP_FONDO },
    ],
    herrajes: ({ estantes }) => [
      { texto: "Soporte de estante", cantidad: Math.ceil((estantes * 4) / 2), nota: "Pares (4 apoyos por estante)" },
      { texto: "Escuadra de refuerzo", cantidad: 1, nota: "Pack de 10" },
      { texto: "Tornillo para aglomerado", cantidad: 1, nota: "Caja de 100" },
    ],
  },
];

export function medidasPorDefecto(diseno) {
  return Object.fromEntries(diseno.medidas.map((m) => [m.clave, m.defecto]));
}

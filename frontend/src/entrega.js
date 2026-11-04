// Textos de la forma de entrega. El backend guarda "retiro" o "envio".
export const ETIQUETAS_ENTREGA = {
  retiro: "Retiro en el corralón",
  envio: "Envío",
};

export const etiquetaEntrega = (valor) =>
  ETIQUETAS_ENTREGA[valor] ?? ETIQUETAS_ENTREGA.retiro;

// Número de WhatsApp de ProMadera: código de país + 9 + área sin 0 + número, solo dígitos.
// Se define en frontend/.env (VITE_WHATSAPP_NUMERO) y no se sube al repositorio.
export const WHATSAPP_PROMADERA = import.meta.env.VITE_WHATSAPP_NUMERO || "";

// Arma el link de WhatsApp para un número. Sin número devuelve null.
export function urlWhatsApp(telefono, mensaje = "") {
  const numero = String(telefono ?? "").replace(/\D/g, "");
  if (!numero) return null;
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/${numero}${texto}`;
}

// Link al WhatsApp de ProMadera (el número del .env). Sin número devuelve null.
export const urlWhatsAppProMadera = (mensaje = "") =>
  urlWhatsApp(WHATSAPP_PROMADERA, mensaje);

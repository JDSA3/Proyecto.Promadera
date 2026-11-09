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

// Arma el link de WhatsApp para el número de un corralón.
// Acepta números de Argentina con o sin el 549 adelante. Devuelve null si está vacío.
export function urlWhatsApp(numero, mensaje) {
  let n = String(numero ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (!n) return null;
  if (n.startsWith("54")) {
    if (!n.startsWith("549")) n = "549" + n.slice(2); // 54 + área... → 549 + área...
  } else {
    n = "549" + n; // área + número, sin prefijo de país
  }
  return `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}`;
}

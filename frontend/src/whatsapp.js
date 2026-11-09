// Número de WhatsApp de ProMadera: código de país + 9 + área sin 0 + número, solo dígitos.
// Se define en frontend/.env (VITE_WHATSAPP_NUMERO) y no se sube al repositorio.
export const WHATSAPP_PROMADERA = import.meta.env.VITE_WHATSAPP_NUMERO || "";

// Arma el link de WhatsApp para un número de Argentina.
// Acepta el número con o sin el 549 adelante. Sin número devuelve null.
export function urlWhatsApp(telefono, mensaje = "") {
  let numero = String(telefono ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (!numero) return null;

  if (numero.startsWith("54")) {
    if (!numero.startsWith("549")) numero = "549" + numero.slice(2); // 54 + área → 549 + área
  } else {
    numero = "549" + numero; // área + número, sin prefijo de país
  }

  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/${numero}${texto}`;
}

// Link de WhatsApp al número de ProMadera.
export function urlWhatsAppProMadera(mensaje = "") {
  return urlWhatsApp(WHATSAPP_PROMADERA, mensaje);
}

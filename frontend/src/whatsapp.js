// Arma el link para escribirle a un corralón por WhatsApp.
// El teléfono tiene que venir con código de país (por ejemplo 549387XXXXXXX).
export function urlWhatsApp(telefono, mensaje = "") {
  const numero = String(telefono ?? "").replace(/\D/g, "");
  if (!numero) return null;
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/${numero}${texto}`;
}

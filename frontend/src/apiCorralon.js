import { API_BASE } from "./api.js";

async function leer(res) {
  if (res.ok) return res.status === 204 ? null : res.json();

  let detalle = `Error ${res.status}`;
  try {
    const cuerpo = await res.json();
    if (typeof cuerpo.detail === "string") detalle = cuerpo.detail;
    else if (Array.isArray(cuerpo.detail)) detalle = cuerpo.detail.map((e) => e.msg).join(". ");
  } catch {
    /* la respuesta no era JSON */
  }
  throw new Error(detalle);
}

// ----- Solicitud de corralón (lado del corralón) -----

export const obtenerMiSolicitud = (usuarioId) =>
  fetch(`${API_BASE}/solicitudes-corralon/mia?usuario_id=${usuarioId}`).then(leer);

export function enviarSolicitud(usuarioId, datos, archivo) {
  const formulario = new FormData();
  formulario.append("usuario_id", usuarioId);
  formulario.append("nombre_comercial", datos.nombre_comercial);
  formulario.append("cuit", datos.cuit);
  formulario.append("telefono", datos.telefono);
  formulario.append("direccion", datos.direccion);
  formulario.append("tipo_comprobante", datos.tipo_comprobante);
  formulario.append("archivo", archivo);
  // Sin header Content-Type: el navegador lo arma con el boundary
  return fetch(`${API_BASE}/solicitudes-corralon`, { method: "POST", body: formulario }).then(leer);
}

// ----- Solicitudes de corralón (lado del administrador) -----

export function listarSolicitudes(adminId, estado) {
  const filtro = estado ? `&estado=${estado}` : "";
  return fetch(`${API_BASE}/admin/solicitudes-corralon?usuario_id=${adminId}${filtro}`).then(leer);
}

export const aprobarSolicitud = (adminId, solicitudId) =>
  fetch(`${API_BASE}/admin/solicitudes-corralon/${solicitudId}/aprobar?usuario_id=${adminId}`, {
    method: "POST",
  }).then(leer);

export const rechazarSolicitud = (adminId, solicitudId, motivo) =>
  fetch(`${API_BASE}/admin/solicitudes-corralon/${solicitudId}/rechazar?usuario_id=${adminId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motivo }),
  }).then(leer);

export const urlArchivoSolicitud = (solicitudId, adminId) =>
  `${API_BASE}/admin/solicitudes-corralon/${solicitudId}/archivo?usuario_id=${adminId}`;

// ----- Panel del corralón -----

export const obtenerEstadisticas = (corralonId, usuarioId, meses = 6) =>
  fetch(`${API_BASE}/corralones/${corralonId}/estadisticas?usuario_id=${usuarioId}&meses=${meses}`).then(leer);

export const obtenerPerfil = (corralonId, usuarioId) =>
  fetch(`${API_BASE}/corralones/${corralonId}/perfil?usuario_id=${usuarioId}`).then(leer);

export const guardarPerfil = (corralonId, usuarioId, datos) =>
  fetch(`${API_BASE}/corralones/${corralonId}/perfil?usuario_id=${usuarioId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  }).then(leer);

export function subirLogo(corralonId, usuarioId, archivo) {
  const formulario = new FormData();
  formulario.append("usuario_id", usuarioId);
  formulario.append("archivo", archivo);
  return fetch(`${API_BASE}/corralones/${corralonId}/logo`, { method: "PUT", body: formulario }).then(leer);
}

// version sirve para que el navegador recargue el logo después de cambiarlo
export const urlLogo = (corralonId, version = "") =>
  `${API_BASE}/corralones/${corralonId}/logo${version ? `?v=${version}` : ""}`;

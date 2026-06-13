// lib/auth.js
// Configuración de autenticación para la sección Ventas de Segunda (VS)
// Mantener separado de los PINs de Desembolso (AC_PIN / LEGAL_PIN en page.js)

export const VS_ROLES = {
  NOTARIA:   'notaria',
  TESORERIA: 'tesoreria',
}

/**
 * Usuarios VS con sus PINs y roles.
 * ANTES DEL GO-LIVE: cambiar los PINs placeholder por valores definitivos.
 */
export const VS_USUARIOS = [
  { pin: 'NOT001', nombre: 'Notaría',   rol: VS_ROLES.NOTARIA   },
  { pin: 'TES001', nombre: 'Tesorería', rol: VS_ROLES.TESORERIA },
]

/**
 * PIN de vista previa (acceso temporal durante desarrollo / QA).
 * Otorga rol Tesorería (visibilidad máxima) para pruebas internas.
 * Cambiar o eliminar antes del despliegue definitivo.
 */
export const VS_PREVIEW_PIN = 'GG2025'

/**
 * Autentica un PIN y retorna el objeto usuario, o null si no coincide.
 */
export function autenticarVS(pin) {
  const p = pin.trim()
  const usuario = VS_USUARIOS.find(u => u.pin === p)
  if (usuario) return usuario
  if (p === VS_PREVIEW_PIN) {
    return { pin: VS_PREVIEW_PIN, nombre: 'Vista previa', rol: VS_ROLES.TESORERIA }
  }
  return null
}

/** Tesorería puede ver y editar campos de pago (Pago Vehículo, Pago Notariales). */
export function puedeVerPagos(rol) {
  return rol === VS_ROLES.TESORERIA
}

/** Notaría y Tesorería pueden observar y levantar observaciones de documentos. */
export function puedeObservarDocs(rol) {
  return [VS_ROLES.NOTARIA, VS_ROLES.TESORERIA].includes(rol)
}

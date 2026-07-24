// lib/auth.js — GoTrack VS · Autenticación
// Los PIN NO se validan en el cliente: el login pasa por el servidor (loginVS ->
// acción 'login' del Apps Script). Notaría se valida contra la pestaña "Ciudades";
// Tesorería/Legal contra la config del script. Comercial accede sin PIN.

/**
 * Permisos por rol.
 *
 * verDocumentos   : muestra links de Drive (FOTO_DNI, PAGO_VEHICULO, etc.)
 * acciones        : qué botones de acción puede ejecutar
 * estadosObservar : en qué estados puede usar observar_docs / resolver_obs
 *                   '*' = cualquier etapa
 */
export const PERMISOS = {
  tesoreria: {
    verDocumentos: true,
    acciones: [
      'confirmar_a_notaria',      // INGRESADO → CONFIRMADO
      'observar_docs',
      'marcar_subsanado',         // DOCS_OBSERVADOS → DOCS_SUBSANADOS
      'confirmar_subsanacion',    // DOCS_SUBSANADOS → estado previo (si Tesorería observó)
    ],
    estadosObservar: ['INGRESADO', 'CONFIRMADO'],
  },
  notaria: {
    verDocumentos: true,
    acciones: [
      'confirmar_cita',           // EN_CITA → CITA_CONFIRMADA (ventana 30 min)
      'observar_docs',
      'marcar_subsanado',         // DOCS_OBSERVADOS → DOCS_SUBSANADOS
      'confirmar_subsanacion',    // DOCS_SUBSANADOS → estado previo (si Notaría observó)
      'firmar',
      'solicitar_gm',             // Notaría solicita levantamiento de GM a Legal
    'reagendar',              // Notaría puede reagendar cita
    ],
    estadosObservar: ['EN_CITA', 'CITA_CONFIRMADA', 'DOCS_OBSERVADOS', 'GM_SOLICITADA', 'GM_LEVANTADA'],
  },
  legal: {
    verDocumentos: true,
    acciones: [
      'observar_docs',
      'marcar_subsanado',         // DOCS_OBSERVADOS → DOCS_SUBSANADOS
      'confirmar_subsanacion',    // DOCS_SUBSANADOS → estado previo (si Legal observó)
      'levantar_gm',              // Legal confirma que la GM fue levantada
      'inscribir',                // Legal inscribe en RRPP luego de la firma
    ],
    estadosObservar: '*',
  },
}

/**
 * Devuelve el objeto de permisos para un rol dado.
 * rol === null → Comercial (sin PIN).
 */
export function getPermisos(rol) {
  if (!rol) {
    return {
      verDocumentos: true,          // Comercial también ve los documentos Drive
      acciones: ['agendar_cita', 'marcar_subsanado'],
      estadosObservar: [],
    }
  }
  return PERMISOS[rol] || { verDocumentos: false, acciones: [], estadosObservar: [] }
}

// Login server-side (c3): valida el PIN contra el backend (notaría por ciudad o rol global).
// El PIN nunca se compara en el cliente; el script responde { ok, rol, ciudad, nombre }.
export async function loginVS(pin, url) {
  const p = String(pin || '').trim()
  if (!p || !url) return { ok: false, error: 'Faltan datos' }
  try {
    const res = await fetch(`${url}?action=login&pin=${encodeURIComponent(p)}`, { cache: 'no-store' })
    const data = await res.json()
    return data && data.ok ? data : { ok: false, error: (data && data.error) || 'PIN incorrecto' }
  } catch (e) {
    return { ok: false, error: 'Error de conexión' }
  }
}

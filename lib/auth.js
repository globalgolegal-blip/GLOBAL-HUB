// lib/auth.js — GoTrack VS · Autenticación por PIN
// Comercial no necesita PIN: accede sin autenticación con permisos limitados.

const USUARIOS_VS = {
  'TES01':   { nombre: 'Tesorería', rol: 'tesoreria' },
  'NOT01':   { nombre: 'Notaría',   rol: 'notaria'   },
  '4815926': { nombre: 'Legal',     rol: 'legal'     },
}

/**
 * Autentica un PIN.
 * @returns {{ nombre: string, rol: string } | null}
 */
export function autenticarVS(pin) {
  if (!pin) return null
  const u = USUARIOS_VS[pin.trim()]
  return u ? { ...u } : null
}

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
      'confirmar_a_notaria',  // INGRESADO → CONFIRMADO
      'observar_docs',
      'resolver_obs',
      'inscribir',
    ],
    estadosObservar: ['INGRESADO', 'CONFIRMADO'],
  },
  notaria: {
    verDocumentos: true,
    acciones: [
      'confirmar_cita',       // EN_CITA → CITA_CONFIRMADA (ventana 30 min)
      'observar_docs',
      'resolver_obs',
      'firmar',
      'solicitar_gm',         // Notaría solicita levantamiento de GM a Legal
    ],
    estadosObservar: ['EN_CITA', 'CITA_CONFIRMADA', 'DOCS_OBSERVADOS', 'GM_SOLICITADA', 'GM_LEVANTADA'],
  },
  legal: {
    verDocumentos: true,
    acciones: [
      'observar_docs',
      'resolver_obs',
      'levantar_gm',          // Legal confirma que la GM fue levantada
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
      acciones: ['agendar_cita'],
      estadosObservar: [],
    }
  }
  return PERMISOS[rol] || { verDocumentos: false, acciones: [], estadosObservar: [] }
}

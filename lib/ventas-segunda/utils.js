// lib/ventas-segunda/utils.js
'use strict'

/**
 * Configuración visual de cada estado.
 * Usado en badges y resúmenes.
 */
export const ESTADO_CONFIG_VS = {
  INGRESADO: {
    label:        'Ingresado',
    labelCorto:   'Ingresado',
    colorText:    '#1E40AF',
    bgBadge:      '#DBEAFE',
    borderBadge:  '#93C5FD',
  },
  CONFIRMADO: {
    label:        'Confirmado a Notaría',
    labelCorto:   'Confirmado',
    colorText:    '#92400E',
    bgBadge:      '#FEF3C7',
    borderBadge:  '#FCD34D',
  },
  EN_CITA: {
    label:        'Cita agendada',
    labelCorto:   'En cita',
    colorText:    '#065F46',
    bgBadge:      '#D1FAE5',
    borderBadge:  '#6EE7B7',
  },
  CITA_CONFIRMADA: {
    label:        'Cita confirmada',
    labelCorto:   'Cita OK',
    colorText:    '#3730A3',
    bgBadge:      '#EDE9FE',
    borderBadge:  '#A78BFA',
  },
  SIN_CITA: {
    label:        'Sin cita — directo a firma',
    labelCorto:   'Sin cita',
    colorText:    '#92400E',
    bgBadge:      '#FEF9C3',
    borderBadge:  '#FDE047',
  },
  DOCS_OBSERVADOS: {
    label:        'Documentos observados',
    labelCorto:   'Obs. Docs',
    colorText:    '#9D174D',
    bgBadge:      '#FCE7F3',
    borderBadge:  '#F9A8D4',
  },
  GM_SOLICITADA: {
    label:        'GM solicitada',
    labelCorto:   'GM Solic.',
    colorText:    '#5B21B6',
    bgBadge:      '#EDE9FE',
    borderBadge:  '#C4B5FD',
  },
  GM_LEVANTADA: {
    label:        'GM levantada',
    labelCorto:   'GM Levant.',
    colorText:    '#065F46',
    bgBadge:      '#ECFDF5',
    borderBadge:  '#6EE7B7',
  },
  FIRMADO: {
    label:        'Acta firmada',
    labelCorto:   'Firmado',
    colorText:    '#1D4ED8',
    bgBadge:      '#EFF6FF',
    borderBadge:  '#93C5FD',
  },
  INSCRITO: {
    label:        'Inscrito en RRPP',
    labelCorto:   'Inscrito',
    colorText:    '#166534',
    bgBadge:      '#DCFCE7',
    borderBadge:  '#86EFAC',
  },
  PENDIENTE_REAGENDA: {
    label:        'Pendiente de reagenda',
    labelCorto:   'Reagendar',
    colorText:    '#B45309',
    bgBadge:      '#FEF3C7',
    borderBadge:  '#F59E0B',
  },
}

/**
 * Deriva el estado visual de una venta.
 * Prioriza el campo estadoRaw guardado en la hoja (col J).
 * Si está vacío, deriva desde campos de fecha.
 */
export function derivarEstadoVS(venta) {
  const raw = (venta.estadoRaw || venta.estado || '').trim()

  // EN_CITA: verificar si el plazo de confirmación ya venció → PENDIENTE_REAGENDA
  if (raw === 'EN_CITA') {
    const limite = _limiteConfirmacion(venta.fechaCita, venta.horaCita)
    if (limite && new Date() >= limite) return 'PENDIENTE_REAGENDA'
    return 'EN_CITA'
  }

  if (raw && ESTADO_CONFIG_VS[raw]) return raw

  // Derivación por campos cuando no hay estado explícito
  if (venta.fechaInscripcion) return 'INSCRITO'
  if (venta.fechaFirma)       return 'FIRMADO'
  if (venta.gmLevantada)      return 'GM_LEVANTADA'
  if (venta.gmSolicitada)     return 'GM_SOLICITADA'

  return 'INGRESADO'
}

// Calcula el timestamp límite: hora de cita − 30 min
function _limiteConfirmacion(fecha, hora) {
  if (!fecha || !hora) return null
  try {
    let f = fecha
    if (fecha.includes('/')) {
      const [d, m, y] = fecha.split('/')
      f = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
    }
    const cita = new Date(`${f}T${hora}:00`)
    return new Date(cita.getTime() - 30 * 60 * 1000)
  } catch { return null }
}

// ── Validaciones de tiempo ────────────────────────────────────

/**
 * La fecha/hora de cita debe ser al menos `minHoras` horas desde ahora.
 * @param {string} fecha  'YYYY-MM-DD'
 * @param {string} hora   'HH:MM'
 * @param {number} minHoras  default 2
 * @returns {boolean}
 */
export function validarAnticipacionCita(fecha, hora, minHoras = 2) {
  if (!fecha || !hora) return false
  try {
    const cita = new Date(`${fecha}T${hora}:00`)
    return (cita - new Date()) >= minHoras * 60 * 60 * 1000
  } catch {
    return false
  }
}

/**
 * Notaría puede confirmar desde que se agenda hasta 30 min ANTES de la cita.
 * Devuelve false si ya pasó ese límite (la cita debe reagendarse).
 * @param {string} fecha  'YYYY-MM-DD' o 'DD/MM/YYYY'
 * @param {string} hora   'HH:MM'
 * @returns {boolean}
 */
export function puedeConfirmarCita(fecha, hora) {
  const limite = _limiteConfirmacion(fecha, hora)
  if (!limite) return false
  return new Date() < limite
}

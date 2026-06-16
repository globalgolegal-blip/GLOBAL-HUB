// lib/ventas-segunda/utils.js
'use strict'

/**
 * Configuración visual de cada estado.
 * `orden` se usa en VentaList para ordenar cards (menor = más urgente).
 */
export const ESTADO_CONFIG_VS = {
  PENDIENTE_REAGENDA: {
    label:        'Pendiente de reagenda',
    labelCorto:   'Reagendar',
    colorText:    '#B45309',
    bgBadge:      '#FEF3C7',
    borderBadge:  '#F59E0B',
    orden:        1,
  },
  DOCS_OBSERVADOS: {
    label:        'Documentos observados',
    labelCorto:   'Obs. Docs',
    colorText:    '#9D174D',
    bgBadge:      '#FCE7F3',
    borderBadge:  '#F9A8D4',
    orden:        2,
  },
  INGRESADO: {
    label:        'Ingresado',
    labelCorto:   'Ingresado',
    colorText:    '#1E40AF',
    bgBadge:      '#DBEAFE',
    borderBadge:  '#93C5FD',
    orden:        3,
  },
  CONFIRMADO: {
    label:        'Confirmado a Notaría',
    labelCorto:   'Confirmado',
    colorText:    '#92400E',
    bgBadge:      '#FEF3C7',
    borderBadge:  '#FCD34D',
    orden:        4,
  },
  EN_CITA: {
    label:        'Cita agendada',
    labelCorto:   'Cita agendada',
    colorText:    '#065F46',
    bgBadge:      '#D1FAE5',
    borderBadge:  '#6EE7B7',
    orden:        5,
  },
  CITA_CONFIRMADA: {
    label:        'Cita confirmada',
    labelCorto:   'Cita OK',
    colorText:    '#3730A3',
    bgBadge:      '#EDE9FE',
    borderBadge:  '#A78BFA',
    orden:        6,
  },
  SIN_CITA: {
    label:        'Sin cita — directo a firma',
    labelCorto:   'Sin cita',
    colorText:    '#92400E',
    bgBadge:      '#FEF9C3',
    borderBadge:  '#FDE047',
    orden:        7,
  },
  GM_SOLICITADA: {
    label:        'GM solicitada',
    labelCorto:   'GM Solic.',
    colorText:    '#5B21B6',
    bgBadge:      '#EDE9FE',
    borderBadge:  '#C4B5FD',
    orden:        8,
  },
  GM_LEVANTADA: {
    label:        'GM levantada',
    labelCorto:   'GM Levant.',
    colorText:    '#065F46',
    bgBadge:      '#ECFDF5',
    borderBadge:  '#6EE7B7',
    orden:        9,
  },
  FIRMADO: {
    label:        'Acta firmada',
    labelCorto:   'Firmado',
    colorText:    '#1D4ED8',
    bgBadge:      '#EFF6FF',
    borderBadge:  '#93C5FD',
    orden:        10,
  },
  INSCRITO: {
    label:        'Inscrito en RRPP',
    labelCorto:   'Inscrito',
    colorText:    '#166534',
    bgBadge:      '#DCFCE7',
    borderBadge:  '#86EFAC',
    orden:        11,
  },
}

/**
 * Texto explicativo de situación por estado.
 * Se muestra al pie de cada VentaCard (siempre visible).
 * DOCS_OBSERVADOS se construye dinámicamente en el componente (incluye área).
 */
export const ESTADO_DESCRIPCION = {
  INGRESADO:          'Documentos ingresaron — Pendiente confirmación de Tesorería',
  CONFIRMADO:         'Confirmado por Tesorería — Pendiente de agenda',
  EN_CITA:            'Agenda realizada — Pendiente confirmación por Notaría',
  CITA_CONFIRMADA:    'Notaría confirmó — Pendiente solicitar levantamiento de GM',
  PENDIENTE_REAGENDA: 'Notaría no confirmó agenda — Pendiente reagendar',
  DOCS_OBSERVADOS:    null,   // construido dinámicamente con el área observadora
  GM_SOLICITADA:      'Notaría solicitó Levantamiento de GM',
  GM_LEVANTADA:       'Legal levantó la GM',
  FIRMADO:            'Acta firmada — Venta realizada',
  INSCRITO:           'Inscripción realizada — Proceso finalizado',
}

/**
 * Deriva el estado visual de una venta.
 * Lee ESTADO_SHEET (col J del sheet). Si está en EN_CITA y venció el plazo
 * de confirmación, devuelve PENDIENTE_REAGENDA automáticamente.
 */
export function derivarEstadoVS(venta) {
  // Normalizar a MAYÚSCULAS para tolerar entrada manual en el sheet
  const raw = (venta.ESTADO_SHEET || '').trim().toUpperCase()

  if (raw === 'EN_CITA') {
    const limite = _limiteConfirmacion(venta.FECHA_CITA, venta.HORA_CITA)
    if (limite && new Date() >= limite) return 'PENDIENTE_REAGENDA'
    return 'EN_CITA'
  }

  if (raw && ESTADO_CONFIG_VS[raw]) return raw

  // Derivación por campos cuando no hay estado explícito en el sheet
  if (venta.FECHA_INSCRIPCION) return 'INSCRITO'
  if (venta.FECHA_FIRMA)       return 'FIRMADO'
  if (venta.GM_LEVANTADA)      return 'GM_LEVANTADA'
  if (venta.GM_SOLICITADA)     return 'GM_SOLICITADA'

  return 'INGRESADO'
}

// Calcula el timestamp límite: hora de cita − 30 min
function _limiteConfirmacion(fecha, hora) {
  if (!fecha || !hora) return null
  try {
    let f = fecha
    if (fecha.includes('/')) {
      const [d, m, y] = fecha.split('/')
      f = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    const cita = new Date(`${f}T${hora}:00`)
    return new Date(cita.getTime() - 30 * 60 * 1000)
  } catch { return null }
}

// ── Validaciones de tiempo ────────────────────────────────────

/**
 * Valida que la hora esté en los rangos permitidos según el día.
 * Lunes–Viernes : 09:15–12:30  ó  14:15–16:30
 * Sábados       : 09:15–11:45  (un solo bloque)
 * @param {string} hora  - "HH:mm"
 * @param {string} [fecha] - "yyyy-MM-dd" — si se omite se asume semana normal
 */
export function validarRangoHorario(hora, fecha = null) {
  if (!hora) return false
  const partes = String(hora).split(':').map(Number)
  if (partes.length < 2 || isNaN(partes[0]) || isNaN(partes[1])) return false
  const mins = partes[0] * 60 + partes[1]
  if (fecha && _esSabado(fecha)) {
    return mins >= 555 && mins <= 705          // 09:15 – 11:45
  }
  return (mins >= 555 && mins <= 750) ||       // 09:15 – 12:30
         (mins >= 855 && mins <= 990)          // 14:15 – 16:30
}

function _esSabado(fecha) {
  try { return new Date(fecha + 'T12:00:00').getDay() === 6 }
  catch { return false }
}

/**
 * La fecha/hora de cita debe ser al menos `minHoras` horas desde ahora.
 */
export function validarAnticipacionCita(fecha, hora, minHoras = 2) {
  if (!fecha || !hora) return false
  try {
    const cita = new Date(`${fecha}T${hora}:00`)
    return (cita - new Date()) >= minHoras * 60 * 60 * 1000
  } catch { return false }
}

/**
 * Notaría puede confirmar desde que se agenda hasta 30 min ANTES de la cita.
 * Devuelve false si ya pasó ese límite.
 */
export function puedeConfirmarCita(fecha, hora) {
  const limite = _limiteConfirmacion(fecha, hora)
  if (!limite) return false
  return new Date() < limite
}

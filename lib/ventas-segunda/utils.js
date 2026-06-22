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
  DOCS_SUBSANADOS: {
    label:        'Documentos subsanados',
    labelCorto:   'Subsanado',
    colorText:    '#065F46',
    bgBadge:      '#D1FAE5',
    borderBadge:  '#6EE7B7',
    orden:        2.5,
  },
  CONTENIDO_OBSERVADO: {
    label:        'Datos observados por Legal',
    labelCorto:   'Obs. Datos',
    colorText:    '#5B21B6',
    bgBadge:      '#EDE9FE',
    borderBadge:  '#A78BFA',
    orden:        2.7,
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
  DOCS_SUBSANADOS:    'Docs subsanados por el cliente — Pendiente confirmación del área observadora',
  CONTENIDO_OBSERVADO: null,  // construido dinámicamente en el componente
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
 * Regla fuera de horario:
 * Si la hora actual está fuera del horario de atención (09:15–16:30) Y la cita
 * es para MAÑANA (día +1 calendario), solo se permiten horarios desde las 11:00.
 * Para día +2 en adelante no hay restricción adicional.
 *
 * @returns {boolean} true si el horario pasa la regla (no la bloquea)
 */
export function validarReglaDiaAnterior(fechaCita, horaCita) {
  if (!fechaCita || !horaCita) return true

  const ahora = new Date()
  const dow   = ahora.getDay()   // 0=Dom, 1=Lun ... 6=Sab
  const mins  = ahora.getHours() * 60 + ahora.getMinutes()

  // Horario laboral normal (Lun-Vie 09:15-16:30): sin restriccion adicional
  const esLaboral = dow >= 1 && dow <= 5 && mins >= 555 && mins <= 990
  if (esLaboral) return true

  // Calcular proximo dia habil segun ventana actual
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  let proximoHabil

  if (dow === 6 && mins >= 990) {
    // Sabado a partir de las 16:30 -> proximo habil = lunes (2 dias)
    proximoHabil = new Date(hoy.getTime() + 2 * 86400000)
  } else if (dow === 0) {
    // Domingo (todo el dia) -> proximo habil = lunes (1 dia)
    proximoHabil = new Date(hoy.getTime() + 1 * 86400000)
  } else if (dow === 1 && mins < 540) {
    // Lunes antes de las 09:00 -> proximo habil = hoy mismo (lunes)
    proximoHabil = new Date(hoy.getTime())
  } else {
    // Fuera de horario en dia laboral -> manana
    proximoHabil = new Date(hoy.getTime() + 86400000)
  }

  const citaD = new Date(fechaCita + 'T12:00:00')
  citaD.setHours(0, 0, 0, 0)
  if (citaD.getTime() !== proximoHabil.getTime()) return true

  const [hh, mm] = String(horaCita).split(':').map(Number)
  return hh * 60 + mm >= 660  // >= 11:00
}

export function validarAnticipacionCita(fecha, hora, minHoras = 1.5) {
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

/**
 * Devuelve true si la venta tiene al menos una acción pendiente para el rol dado.
 * Se usa para el filtro "Mis pendientes" que se activa al iniciar sesión con PIN.
 *
 * Lógica por rol:
 *   tesoreria → INGRESADO | FIRMADO sin inscripción | DOCS_OBSERVADOS (Tes.) | DOCS_SUBSANADOS (Tes.)
 *   notaria   → EN_CITA | CITA_CONFIRMADA sin GM | GM_LEVANTADA sin firma | DOCS_OBSERVADOS (Not.) | DOCS_SUBSANADOS (Not.)
 *   legal     → GM_SOLICITADA sin levantar | DOCS_OBSERVADOS (Leg.) | DOCS_SUBSANADOS (Leg.)
 */
export function tienePendienteParaRol(venta, rol) {
  const estado    = derivarEstadoVS(venta)
  const gmEstado  = (venta._gmEstado || '').trim().toUpperCase()

  // EN PROCESO: ningún rol tiene pendientes — el proceso está bloqueado
  if (gmEstado === 'EN PROCESO') return false

  const enCalificacion = gmEstado === 'EN CALIFICACION'

  // Extraer el área que realizó la observación de docs (formato "[ÁREA][PREVIO:...] texto")
  const obsRaw    = venta.OBSERVACION_DOCS || ''
  const areaMatch = obsRaw.match(/^\[([^\]]+)\]/)
  const areaObs   = areaMatch ? areaMatch[1] : ''

  if (rol === 'tesoreria') {
    return (
      estado === 'INGRESADO' ||
      !venta.BOLETA_URL ||
      (estado === 'DOCS_OBSERVADOS' && areaObs === 'TESORERÍA') ||
      (estado === 'DOCS_SUBSANADOS' && areaObs === 'TESORERÍA')
    )
  }

  if (rol === 'notaria') {
    return (
      estado === 'EN_CITA' ||
      // CITA_CONFIRMADA: siempre pendiente (normal → solicitar GM; EN CAL. → ambos)
      estado === 'CITA_CONFIRMADA' ||
      // Normal: GM levantada → puede firmar
      (estado === 'GM_LEVANTADA' && !venta.FECHA_FIRMA) ||
      // EN CALIFICACIÓN: GM solicitada pero aún no firmado → notaría puede firmar
      (estado === 'GM_SOLICITADA' && enCalificacion && !venta.FECHA_FIRMA) ||
      // EN CALIFICACIÓN: firmado pero aún no solicitó GM → pendiente de solicitar
      (estado === 'FIRMADO' && enCalificacion && !venta.GM_SOLICITADA) ||
      (estado === 'DOCS_OBSERVADOS' && areaObs === 'NOTARÍA') ||
      (estado === 'DOCS_SUBSANADOS' && areaObs === 'NOTARÍA')
    )
  }

  if (rol === 'legal') {
    return (
      (!!venta.GM_SOLICITADA && !venta.GM_LEVANTADA) ||
      (!!venta.FECHA_FIRMA   && !venta.FECHA_INSCRIPCION) ||
      (estado === 'DOCS_OBSERVADOS' && areaObs === 'LEGAL') ||
      (estado === 'DOCS_SUBSANADOS' && areaObs === 'LEGAL') ||
      estado === 'CONTENIDO_OBSERVADO'
    )
  }

  return false
}

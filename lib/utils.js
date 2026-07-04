export const ESTADOS = {
  INGRESADO:          'INGRESADO',
  PENDIENTE:          'PENDIENTE',
  SOLICITADO:         'SOLICITADO',
  OBSERVADO:          'OBSERVADO',
  CONTRATO_OBSERVADO: 'CONTRATO_OBSERVADO',
  VENCIDO:            'VENCIDO',
  VALIDADO:           'VALIDADO',
  PENDIENTE_JOTFORM:  'PENDIENTE_JOTFORM',   // Etapa 1: Legal debe subir JotForm
  OBSERVADO_SISTEMA:  'OBSERVADO_SISTEMA',   // Etapa 1: JotForm flaggeó un problema en col V
}

export const ESTADO_CONFIG = {
  PENDIENTE:          { label: 'Contratos por firmar',  labelCorto: 'Por firmar',      colorText: '#185FA5', bgBadge: '#E6F1FB', borderBadge: '#185FA5', borderCard: '#185FA5', orden: 3 },
  SOLICITADO:         { label: 'Validación solicitada', labelCorto: 'Solicitado',      colorText: '#CC5500', bgBadge: '#FFF0E6', borderBadge: '#ff6600', borderCard: '#ff6600', orden: 2 },
  INGRESADO:          { label: 'Contratos emitidos',    labelCorto: 'Emitido',         colorText: '#534AB7', bgBadge: '#EEEDFE', borderBadge: '#534AB7', borderCard: '#534AB7', orden: 5 },
  CONTRATO_OBSERVADO: { label: 'Contratos observados',  labelCorto: 'Cto. observado',  colorText: '#BA7517', bgBadge: '#FAEEDA', borderBadge: '#BA7517', borderCard: '#BA7517', orden: 2 },
  VALIDADO:           { label: 'Firmas validadas',      labelCorto: 'Validado',        colorText: '#0F6E56', bgBadge: '#E1F5EE', borderBadge: '#0F6E56', borderCard: '#0F6E56', orden: 4 },
  OBSERVADO:          { label: 'Firmas observadas',     labelCorto: 'Firma observada', colorText: '#993C1D', bgBadge: '#FAECE7', borderBadge: '#D85A30', borderCard: '#D85A30', orden: 1 },
  VENCIDO:            { label: 'Contratos vencidos',    labelCorto: 'Vencido',         colorText: '#791F1F', bgBadge: '#FCEBEB', borderBadge: '#A32D2D', borderCard: '#A32D2D', orden: 0 },
  OBSERVADO_SISTEMA:  { label: 'Obs. sistema',          labelCorto: 'Obs. sistema',    colorText: '#6B21A8', bgBadge: '#F3E8FF', borderBadge: '#9333EA', borderCard: '#9333EA', orden: 1 },
  PENDIENTE_JOTFORM:  { label: 'Pendiente JotForm',     labelCorto: 'JotForm',         colorText: '#CC5500', bgBadge: '#FFF0E6', borderBadge: '#ff6600', borderCard: '#ff6600', orden: 2 },
}

export function derivarEstado(contrato) {
  const enviado      = (contrato['CONTRATO ENVIADO']          || '').trim().toUpperCase()
  const firma        = (contrato['CONTRATO FIRMADO CONFORME'] || '').trim().toUpperCase()
  const solicitudRaw = (contrato['SOLICITUD']                 || '').trim()
  const solicitudVal = solicitudRaw.split('|')[0].toUpperCase()

  // ── Estados definitivos que cierran el contrato ──────────────────────────────
  if (enviado === 'OBSERVADO') return ESTADOS.CONTRATO_OBSERVADO
  if (firma === 'SI')          return ESTADOS.VALIDADO
  if (firma === 'OBSERVADO')   return ESTADOS.OBSERVADO
  if (firma === 'VENCIDO')     return ESTADOS.VENCIDO

  // ── Col V: JotForm escribió resultado ─────────────────────────────────────────
  // IMPORTANTE: el campo debe coincidir con el encabezado exacto de la celda V2.
  // CONFORME  → Legal debe confirmar subida (PENDIENTE_JOTFORM)
  // Otro valor → JotForm flaggeó un problema (OBSERVADO_SISTEMA)
  const resultado = (contrato['RESULTADO'] || '').trim().toUpperCase()
  if (resultado === 'CONFORME') return ESTADOS.PENDIENTE_JOTFORM
  if (resultado)                return ESTADOS.OBSERVADO_SISTEMA

  // ── Vencimiento por fecha ────────────────────────────────────────────────────
  if (contrato['FECHA DE VENCIMIENTO']) {
    const raw = String(contrato['FECHA DE VENCIMIENTO']).trim()
    let fechaVenc = null
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const p = raw.split('/')
      fechaVenc = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]))
    } else {
      fechaVenc = new Date(raw)
    }
    if (fechaVenc && !isNaN(fechaVenc)) {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
      if (fechaVenc < hoy) return ESTADOS.VENCIDO
    }
  }

  // ── Contratos enviados en curso ───────────────────────────────────────────────
  if (enviado === 'SI' && (firma === 'NO' || firma === '' || firma === 'PENDIENTE')) {
    if (solicitudVal === 'SOLICITADO') return ESTADOS.SOLICITADO
    return ESTADOS.PENDIENTE
  }

  return ESTADOS.INGRESADO
}

// ── estadoParaVista ──────────────────────────────────────────────────────────
// Devuelve el estado que ve el operador (sin revelar estados internos de Legal).
// OBSERVADO_SISTEMA aparece como PENDIENTE para el operador: no sabe que JotForm
// lo flaggeó, simplemente lo ve como un contrato en trámite normal.
export function estadoParaVista(estado, contrato) {
  if (estado === ESTADOS.OBSERVADO_SISTEMA) return ESTADOS.PENDIENTE
  if (estado === ESTADOS.PENDIENTE_JOTFORM) return ESTADOS.PENDIENTE
  return estado
}

// Lee intentos desde col T — funciona con SOLICITADO|N e HISTORIAL|N
export function extraerIntentos(contrato) {
  const solicitudRaw = (contrato['SOLICITUD'] || '').trim()
  if (!solicitudRaw.includes('|')) return 0
  return parseInt(solicitudRaw.split('|')[1] || '0', 10)
}

export function parsearFecha(str) {
  if (!str) return null
  const partes = str.split('/')
  if (partes.length !== 3) return null
  return new Date(partes[2], partes[1] - 1, partes[0])
}

export function formatearFecha(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

export function hoyISO() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`
}

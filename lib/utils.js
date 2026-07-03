// lib/utils.js — ETAPA 1: soporte para PENDIENTE_JOTFORM y OBSERVADO_SISTEMA
// Reemplaza completamente el archivo lib/utils.js del repositorio.

export const ESTADOS = {
  INGRESADO:          'INGRESADO',
  PENDIENTE:          'PENDIENTE',
  SOLICITADO:         'SOLICITADO',
  OBSERVADO:          'OBSERVADO',
  CONTRATO_OBSERVADO: 'CONTRATO_OBSERVADO',
  VENCIDO:            'VENCIDO',
  VALIDADO:           'VALIDADO',
  PENDIENTE_JOTFORM:  'PENDIENTE_JOTFORM',  // [NUEVO] RESULTADO=CONFORME, JotForm pendiente
  OBSERVADO_SISTEMA:  'OBSERVADO_SISTEMA',  // [NUEVO] RESULTADO contiene observación
}

export const ESTADO_CONFIG = {
  PENDIENTE:          { label: 'Contratos por firmar',   labelCorto: 'Por firmar',      colorText: '#185FA5', bgBadge: '#E6F1FB', borderBadge: '#185FA5', borderCard: '#185FA5', orden: 3 },
  SOLICITADO:         { label: 'Validación solicitada',  labelCorto: 'Solicitado',      colorText: '#CC5500', bgBadge: '#FFF0E6', borderBadge: '#ff6600', borderCard: '#ff6600', orden: 2 },
  INGRESADO:          { label: 'Contratos emitidos',     labelCorto: 'Emitido',         colorText: '#534AB7', bgBadge: '#EEEDFE', borderBadge: '#534AB7', borderCard: '#534AB7', orden: 5 },
  CONTRATO_OBSERVADO: { label: 'Contratos observados',   labelCorto: 'Cto. observado',  colorText: '#BA7517', bgBadge: '#FAEEDA', borderBadge: '#BA7517', borderCard: '#BA7517', orden: 2 },
  VALIDADO:           { label: 'Firmas validadas',       labelCorto: 'Validado',        colorText: '#0F6E56', bgBadge: '#E1F5EE', borderBadge: '#0F6E56', borderCard: '#0F6E56', orden: 4 },
  OBSERVADO:          { label: 'Firmas observadas',      labelCorto: 'Firma observada', colorText: '#993C1D', bgBadge: '#FAECE7', borderBadge: '#D85A30', borderCard: '#D85A30', orden: 1 },
  VENCIDO:            { label: 'Contratos vencidos',     labelCorto: 'Vencido',         colorText: '#791F1F', bgBadge: '#FCEBEB', borderBadge: '#A32D2D', borderCard: '#A32D2D', orden: 0 },
  // ── NUEVOS (internos — solo visibles con PIN Legal) ─────────────────────────
  PENDIENTE_JOTFORM:  { label: 'Pendiente de JotForm',  labelCorto: 'JotForm pend.',   colorText: '#6B3FA0', bgBadge: '#F3EEFE', borderBadge: '#6B3FA0', borderCard: '#6B3FA0', orden: 3 },
  OBSERVADO_SISTEMA:  { label: 'Observado por sistema', labelCorto: 'Obs. sistema',    colorText: '#92400E', bgBadge: '#FEF3C7', borderBadge: '#D97706', borderCard: '#D97706', orden: 1 },
}

export function derivarEstado(contrato) {
  const enviado      = (contrato['CONTRATO ENVIADO']          || '').trim().toUpperCase()
  const firma        = (contrato['CONTRATO FIRMADO CONFORME'] || '').trim().toUpperCase()
  const solicitudRaw = (contrato['SOLICITUD']                 || '').trim()
  const solicitudVal = solicitudRaw.split('|')[0].toUpperCase()

  // Las acciones manuales del operador siempre tienen prioridad
  if (enviado === 'OBSERVADO') return ESTADOS.CONTRATO_OBSERVADO
  if (firma === 'SI')          return ESTADOS.VALIDADO
  if (firma === 'OBSERVADO')   return ESTADOS.OBSERVADO
  if (firma === 'VENCIDO')     return ESTADOS.VENCIDO

  // Columna V (RESULTADO): validación automática del sistema
  // Solo aplica si no hay decisión manual previa (firma vacía, NO o PENDIENTE)
  const resultado = (contrato['RESULTADO'] || '').trim()
  if (resultado) {
    if (resultado.toUpperCase() === 'CONFORME') return ESTADOS.PENDIENTE_JOTFORM
    return ESTADOS.OBSERVADO_SISTEMA  // cualquier otro texto = observado
  }

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

  if (enviado === 'SI' && (firma === 'NO' || firma === '' || firma === 'PENDIENTE')) {
    if (solicitudVal === 'SOLICITADO') return ESTADOS.SOLICITADO
    return ESTADOS.PENDIENTE
  }

  return ESTADOS.INGRESADO
}

/**
 * Mapea estados internos (solo Legal) a estados de vista pública.
 * - PENDIENTE_JOTFORM → 'VALIDADO'     (el sistema ya lo aprobó)
 * - OBSERVADO_SISTEMA → 'PENDIENTE' o 'SOLICITADO' según col T
 * - Resto → sin cambio
 */
export function estadoParaVista(estado, contrato) {
  if (estado === 'PENDIENTE_JOTFORM') return 'VALIDADO'
  if (estado === 'OBSERVADO_SISTEMA') {
    const sol = (contrato['SOLICITUD'] || '').toUpperCase().split('|')[0]
    return sol === 'SOLICITADO' ? 'SOLICITADO' : 'PENDIENTE'
  }
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

export const ESTADOS = {
  INGRESADO:          'INGRESADO',
  PENDIENTE:          'PENDIENTE',
  SOLICITADO:         'SOLICITADO',
  OBSERVADO:          'OBSERVADO',
  CONTRATO_OBSERVADO: 'CONTRATO_OBSERVADO',
  VENCIDO:            'VENCIDO',
  VALIDADO:           'VALIDADO',
}

export const ESTADO_CONFIG = {
  PENDIENTE:          { label: 'Contratos por firmar',  labelCorto: 'Por firmar',      colorText: '#185FA5', bgBadge: '#E6F1FB', borderBadge: '#185FA5', borderCard: '#185FA5', orden: 3 },
  SOLICITADO:         { label: 'Validación solicitada', labelCorto: 'Solicitado',      colorText: '#CC5500', bgBadge: '#FFF0E6', borderBadge: '#ff6600', borderCard: '#ff6600', orden: 2 },
  INGRESADO:          { label: 'Contratos emitidos',    labelCorto: 'Emitido',         colorText: '#534AB7', bgBadge: '#EEEDFE', borderBadge: '#534AB7', borderCard: '#534AB7', orden: 5 },
  CONTRATO_OBSERVADO: { label: 'Contratos observados',  labelCorto: 'Cto. observado',  colorText: '#BA7517', bgBadge: '#FAEEDA', borderBadge: '#BA7517', borderCard: '#BA7517', orden: 2 },
  VALIDADO:           { label: 'Firmas validadas',      labelCorto: 'Validado',        colorText: '#0F6E56', bgBadge: '#E1F5EE', borderBadge: '#0F6E56', borderCard: '#0F6E56', orden: 4 },
  OBSERVADO:          { label: 'Firmas observadas',     labelCorto: 'Firma observada', colorText: '#993C1D', bgBadge: '#FAECE7', borderBadge: '#D85A30', borderCard: '#D85A30', orden: 1 },
  VENCIDO:            { label: 'Contratos vencidos',    labelCorto: 'Vencido',         colorText: '#791F1F', bgBadge: '#FCEBEB', borderBadge: '#A32D2D', borderCard: '#A32D2D', orden: 0 },
}

export function derivarEstado(contrato) {
  const enviado      = (contrato['CONTRATO ENVIADO']          || '').trim().toUpperCase()
  const firma        = (contrato['CONTRATO FIRMADO CONFORME'] || '').trim().toUpperCase()
  const solicitudRaw = (contrato['SOLICITUD']                 || '').trim()
  const solicitudVal = solicitudRaw.split('|')[0].toUpperCase()

  if (enviado === 'OBSERVADO') return ESTADOS.CONTRATO_OBSERVADO
  if (firma === 'SI')          return ESTADOS.VALIDADO
  if (firma === 'OBSERVADO')   return ESTADOS.OBSERVADO
  if (firma === 'VENCIDO')     return ESTADOS.VENCIDO

  if (contrato['FECHA DE VENCIMIENTO']) {
    const partes = String(contrato['FECHA DE VENCIMIENTO']).split('/')
    if (partes.length === 3) {
      const fechaVenc = new Date(partes[2], partes[1] - 1, partes[0])
      const hoy = new Date(); hoy.setHours(0,0,0,0)
      if (fechaVenc < hoy) return ESTADOS.VENCIDO
    }
  }

  if (enviado === 'SI' && (firma === 'NO' || firma === '' || firma === 'PENDIENTE')) {
    if (solicitudVal === 'SOLICITADO') return ESTADOS.SOLICITADO
    return ESTADOS.PENDIENTE
  }

  return ESTADOS.INGRESADO
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

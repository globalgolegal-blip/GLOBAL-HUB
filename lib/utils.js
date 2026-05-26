// Estados posibles de un contrato
export const ESTADOS = {
  INGRESADO:          'INGRESADO',          // Registrado pero aún no enviado al cliente
  PENDIENTE:          'PENDIENTE',          // Enviado (SI) y con FIRMADO = NO, cliente aún no firma
  OBSERVADO:          'OBSERVADO',          // Firmó fuera de su domicilio (firma observada)
  CONTRATO_OBSERVADO: 'CONTRATO_OBSERVADO', // Contrato no se pudo emitir (observado antes del envío)
  VENCIDO:            'VENCIDO',            // Pasaron 4 días sin firma
  VALIDADO:           'VALIDADO',           // Legal aprobó → Tesorería puede desembolsar
}

export const ESTADO_CONFIG = {
  PENDIENTE:          { label: 'Contratos por firmar',  labelCorto: 'Por firmar',      colorText: '#185FA5', bgBadge: '#E6F1FB', borderBadge: '#185FA5', borderCard: '#185FA5', orden: 3 },
  INGRESADO:          { label: 'Contratos emitidos',    labelCorto: 'Emitido',         colorText: '#534AB7', bgBadge: '#EEEDFE', borderBadge: '#534AB7', borderCard: '#534AB7', orden: 5 },
  CONTRATO_OBSERVADO: { label: 'Contratos observados',  labelCorto: 'Cto. observado',  colorText: '#BA7517', bgBadge: '#FAEEDA', borderBadge: '#BA7517', borderCard: '#BA7517', orden: 2 },
  VALIDADO:           { label: 'Firmas validadas',      labelCorto: 'Validado',        colorText: '#0F6E56', bgBadge: '#E1F5EE', borderBadge: '#0F6E56', borderCard: '#0F6E56', orden: 4 },
  OBSERVADO:          { label: 'Firmas observadas',     labelCorto: 'Firma observada', colorText: '#993C1D', bgBadge: '#FAECE7', borderBadge: '#D85A30', borderCard: '#D85A30', orden: 1 },
  VENCIDO:            { label: 'Contratos vencidos',    labelCorto: 'Vencido',         colorText: '#791F1F', bgBadge: '#FCEBEB', borderBadge: '#A32D2D', borderCard: '#A32D2D', orden: 0 },
}

// Deriva el estado de un contrato a partir de los datos del Excel
export function derivarEstado(contrato) {
  // Primero verificar si el contrato fue observado antes de emitirse
  const enviado = (contrato['CONTRATO ENVIADO'] || '').trim().toUpperCase()
  if (enviado === 'OBSERVADO') return ESTADOS.CONTRATO_OBSERVADO

  // Luego verificar el estado de la firma
  const firma = (contrato['CONTRATO FIRMADO CONFORME'] || '').trim().toUpperCase()
  if (firma === 'SI')        return ESTADOS.VALIDADO
  if (firma === 'OBSERVADO') return ESTADOS.OBSERVADO
  if (firma === 'VENCIDO')   return ESTADOS.VENCIDO

  // Si no está marcado como VENCIDO pero ya pasó la fecha de vencimiento
  if (contrato['FECHA DE VENCIMIENTO']) {
    const partes = contrato['FECHA DE VENCIMIENTO'].split('/')
    if (partes.length === 3) {
      const fechaVenc = new Date(partes[2], partes[1] - 1, partes[0])
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      if (fechaVenc < hoy) return ESTADOS.VENCIDO
    }
  }

  // Solo PENDIENTE si fue enviado (SI) y explícitamente marcado como NO firmado
  if (enviado === 'SI' && firma === 'NO') return ESTADOS.PENDIENTE

  // Cualquier otro caso (campos en blanco, aún no procesado) = INGRESADO
  return ESTADOS.INGRESADO
}

// Parsea fecha en formato DD/MM/YYYY
export function parsearFecha(str) {
  if (!str) return null
  const partes = str.split('/')
  if (partes.length !== 3) return null
  return new Date(partes[2], partes[1] - 1, partes[0])
}

// Formatea fecha a DD/MM/YYYY
export function formatearFecha(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

// Fecha de hoy en formato YYYY-MM-DD para input type="date"
export function hoyISO() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`
}

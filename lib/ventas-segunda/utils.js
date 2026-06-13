// lib/ventas-segunda/utils.js
// Máquina de estados y configuración visual para Ventas de Segunda

export const ESTADOS_VS = {
  INGRESADO:       'INGRESADO',
  EN_CITA:         'EN_CITA',
  SIN_CITA:        'SIN_CITA',
  DOCS_OBSERVADOS: 'DOCS_OBSERVADOS',
  GM_SOLICITADA:   'GM_SOLICITADA',
  GM_LEVANTADA:    'GM_LEVANTADA',
  FIRMADO:         'FIRMADO',
  INSCRITO:        'INSCRITO',
}

/**
 * Configuración visual por estado (colores consistentes con ESTADO_CONFIG de lib/utils.js).
 * `orden` define el sort de la lista: menor orden = mayor prioridad arriba.
 */
export const ESTADO_CONFIG_VS = {
  DOCS_OBSERVADOS: { label: 'Docs. observados',  labelCorto: 'Observado',     colorText: '#993C1D', bgBadge: '#FAECE7', borderBadge: '#D85A30', borderCard: '#D85A30', orden: 0 },
  INGRESADO:       { label: 'Ingresado',          labelCorto: 'Ingresado',     colorText: '#534AB7', bgBadge: '#EEEDFE', borderBadge: '#534AB7', borderCard: '#534AB7', orden: 1 },
  EN_CITA:         { label: 'Cita programada',    labelCorto: 'Con cita',      colorText: '#185FA5', bgBadge: '#E6F1FB', borderBadge: '#185FA5', borderCard: '#185FA5', orden: 2 },
  SIN_CITA:        { label: 'Sin cita',           labelCorto: 'Sin cita',      colorText: '#BA7517', bgBadge: '#FAEEDA', borderBadge: '#BA7517', borderCard: '#BA7517', orden: 3 },
  GM_SOLICITADA:   { label: 'GM solicitada',      labelCorto: 'GM solicitada', colorText: '#0A7B6F', bgBadge: '#E1F5F2', borderBadge: '#0A7B6F', borderCard: '#0A7B6F', orden: 4 },
  GM_LEVANTADA:    { label: 'GM levantada',       labelCorto: 'GM levantada',  colorText: '#0F6E56', bgBadge: '#E1F5EE', borderBadge: '#0F6E56', borderCard: '#0F6E56', orden: 5 },
  FIRMADO:         { label: 'Acta firmada',       labelCorto: 'Firmado',       colorText: '#3B4BA8', bgBadge: '#EAECFB', borderBadge: '#3B4BA8', borderCard: '#3B4BA8', orden: 6 },
  INSCRITO:        { label: 'Inscrito en RRPP',   labelCorto: 'Inscrito',      colorText: '#1A6B3E', bgBadge: '#D6F0E3', borderBadge: '#1A6B3E', borderCard: '#1A6B3E', orden: 7 },
}

/**
 * Deriva el estado de una venta a partir de sus campos de control.
 *
 * Reglas (en orden de evaluación):
 * 1. INSCRITO y FIRMADO son terminales — se evalúan primero.
 * 2. GM_LEVANTADA precede a la evaluación de observaciones.
 * 3. DOCS_OBSERVADOS es BLOQUEANTE: el proceso no avanza hasta resolver.
 *    Se evalúa ANTES de GM_SOLICITADA para que una obs. tardía bloquee el flujo.
 * 4. El resto en orden ascendente del proceso.
 */
export function derivarEstadoVS(venta) {
  if (venta.FECHA_INSCRIPCION) return ESTADOS_VS.INSCRITO
  if (venta.FECHA_FIRMA)       return ESTADOS_VS.FIRMADO
  if (venta.GM_LEVANTADA)      return ESTADOS_VS.GM_LEVANTADA
  if (venta.OBSERVACION_DOCS)  return ESTADOS_VS.DOCS_OBSERVADOS   // bloqueante
  if (venta.GM_SOLICITADA)     return ESTADOS_VS.GM_SOLICITADA
  if (venta.SIN_CITA)          return ESTADOS_VS.SIN_CITA
  if (venta.FECHA_CITA)        return ESTADOS_VS.EN_CITA
  return ESTADOS_VS.INGRESADO
}

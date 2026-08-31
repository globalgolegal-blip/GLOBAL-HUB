// lib/ventas-segunda/utils.js
'use strict'

import { hoyISO, desplazarISO, instanteLima, ahoraLima } from '../common/fechas'

export const ESTADO_CONFIG_VS = {
  PENDIENTE_REAGENDA: { label:'Pendiente de reagenda', labelCorto:'Reagendar', colorText:'#B45309', bgBadge:'#FEF3C7', borderBadge:'#F59E0B', orden:1 },
  DOCS_OBSERVADOS:    { label:'Documentos observados', labelCorto:'Obs. Docs', colorText:'#9D174D', bgBadge:'#FCE7F3', borderBadge:'#F9A8D4', orden:2 },
  DOCS_SUBSANADOS:    { label:'Documentos subsanados', labelCorto:'Subsanado', colorText:'#065F46', bgBadge:'#D1FAE5', borderBadge:'#6EE7B7', orden:2.5 },
  CONTENIDO_OBSERVADO:{ label:'Datos observados por Legal', labelCorto:'Obs. Datos', colorText:'#5B21B6', bgBadge:'#EDE9FE', borderBadge:'#A78BFA', orden:2.7 },
  INGRESADO:          { label:'Ingresado', labelCorto:'Ingresado', colorText:'#1E40AF', bgBadge:'#DBEAFE', borderBadge:'#93C5FD', orden:3 },
  CONFIRMADO:         { label:'Confirmado a Notaría', labelCorto:'Confirmado', colorText:'#92400E', bgBadge:'#FEF3C7', borderBadge:'#FCD34D', orden:4 },
  EN_CITA:            { label:'Cita agendada', labelCorto:'Cita agendada', colorText:'#065F46', bgBadge:'#D1FAE5', borderBadge:'#6EE7B7', orden:5 },
  CITA_CONFIRMADA:    { label:'Cita confirmada', labelCorto:'Cita OK', colorText:'#3730A3', bgBadge:'#EDE9FE', borderBadge:'#A78BFA', orden:6 },
  SIN_CITA:           { label:'Sin cita — directo a firma', labelCorto:'Sin cita', colorText:'#92400E', bgBadge:'#FEF9C3', borderBadge:'#FDE047', orden:7 },
  GM_SOLICITADA:      { label:'GM solicitada', labelCorto:'GM Solic.', colorText:'#5B21B6', bgBadge:'#EDE9FE', borderBadge:'#C4B5FD', orden:8 },
  GM_LEVANTADA:       { label:'GM levantada', labelCorto:'GM Levant.', colorText:'#065F46', bgBadge:'#ECFDF5', borderBadge:'#6EE7B7', orden:9 },
  FIRMADO:            { label:'Acta firmada', labelCorto:'Firmado', colorText:'#1D4ED8', bgBadge:'#EFF6FF', borderBadge:'#93C5FD', orden:10 },
  ANULADO:            { label:'Anulado', labelCorto:'Anulado', colorText:'#6B7280', bgBadge:'#F3F4F6', borderBadge:'#D1D5DB', orden:99 },
}

export const ESTADO_DESCRIPCION = {
  INGRESADO:'Documentos ingresaron — Pendiente confirmación de Tesorería',
  CONFIRMADO:'Confirmado por Tesorería — Pendiente de agenda',
  EN_CITA:'Agenda realizada — Pendiente confirmación por Notaría',
  CITA_CONFIRMADA:'Notaría confirmó — Pendiente solicitar levantamiento de GM',
  PENDIENTE_REAGENDA:'Notaría no confirmó agenda — Pendiente reagendar',
  DOCS_OBSERVADOS:null,
  DOCS_SUBSANADOS:'Docs subsanados por el cliente — Pendiente confirmación del área observadora',
  CONTENIDO_OBSERVADO:null,
  GM_SOLICITADA:'Notaría solicitó Levantamiento de GM',
  GM_LEVANTADA:'Legal levantó la GM',
  FIRMADO:'Acta firmada — Venta realizada',
}

export function derivarEstadoVS(venta) {
  const raw = (venta.ESTADO_SHEET || '').trim().toUpperCase()
  if (raw === 'ANULADO') return 'ANULADO'
  // EN_CITA se mantiene hasta 30 min DESPUÉS de la cita; luego -> PENDIENTE_REAGENDA.
  // (Transición automática por tiempo; el backend la materializa y la registra.)
  if (raw === 'EN_CITA') {
    const limite = _limiteReagenda(venta.FECHA_CITA, venta.HORA_CITA)
    if (limite && new Date() >= limite) return 'PENDIENTE_REAGENDA'
    return 'EN_CITA'
  }
  if (raw && ESTADO_CONFIG_VS[raw]) return raw
  if (venta.FECHA_FIRMA)       return 'FIRMADO'
  if (venta.GM_LEVANTADA)      return 'GM_LEVANTADA'
  if (venta.GM_SOLICITADA)     return 'GM_SOLICITADA'
  return 'INGRESADO'
}

// Límite tras el cual una cita EN_CITA pasa AUTOMÁTICAMENTE a PENDIENTE_REAGENDA:
// 30 minutos DESPUÉS de la hora de la cita (anclado a America/Lima).
function _limiteReagenda(fecha, hora) {
  let f = fecha
  if (fecha && fecha.includes('/')) { const [d,m,y]=fecha.split('/'); f=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` }
  const cita = instanteLima(f, hora)
  return cita ? new Date(cita.getTime() + 30*60*1000) : null
}

export function validarRangoHorario(hora, fecha = null) {
  if (!hora) return false
  const partes = String(hora).split(':').map(Number)
  if (partes.length < 2 || isNaN(partes[0]) || isNaN(partes[1])) return false
  const mins = partes[0]*60 + partes[1]
  if (fecha && _esSabado(fecha)) return mins>=555 && mins<=705
  return (mins>=555 && mins<=750) || (mins>=855 && mins<=990)
}
function _esSabado(fecha) { try { return new Date(fecha+'T12:00:00').getDay()===6 } catch { return false } }

export function validarReglaDiaAnterior(fechaCita, horaCita) {
  if (!fechaCita || !horaCita) return true
  const { dow, mins } = ahoraLima()
  const esLaboral = dow>=1 && dow<=5 && mins>=555 && mins<=990
  if (esLaboral) return true
  const hoy = hoyISO()
  let proximoHabil
  if (dow===6 && mins>=990) proximoHabil = desplazarISO(hoy,2)
  else if (dow===0) proximoHabil = desplazarISO(hoy,1)
  else if (dow===1 && mins<540) proximoHabil = hoy
  else proximoHabil = desplazarISO(hoy,1)
  let citaISO = fechaCita
  if (fechaCita.includes('/')) { const [d,m,y]=fechaCita.split('/'); citaISO=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` }
  if (citaISO !== proximoHabil) return true
  const [hh, mm] = String(horaCita).split(':').map(Number)
  return hh*60 + mm >= 660
}

export function validarAnticipacionCita(fecha, hora, minHoras = 1.5) {
  const cita = instanteLima(fecha, hora)
  if (!cita) return false
  return (cita.getTime() - Date.now()) >= minHoras*60*60*1000
}


export function tienePendienteParaRol(venta, rol) {
  const estado = derivarEstadoVS(venta)
  const gmEstado = (venta._gmEstado || '').trim().toUpperCase()
  if (gmEstado === 'EN PROCESO') return false
  const enCalificacion = gmEstado === 'EN CALIFICACION'
  const obsRaw = venta.OBSERVACION_DOCS || ''
  const areaMatch = obsRaw.match(/^\[([^\]]+)\]/)
  const areaObs = areaMatch ? areaMatch[1] : ''
  if (rol === 'tesoreria') return (estado==='INGRESADO' || !venta.BOLETA_URL || (estado==='DOCS_OBSERVADOS'&&areaObs==='TESORERÍA') || (estado==='DOCS_SUBSANADOS'&&areaObs==='TESORERÍA'))
  if (rol === 'notaria') return (estado==='EN_CITA' || estado==='CITA_CONFIRMADA' || (estado==='GM_LEVANTADA'&&!venta.FECHA_FIRMA) || (estado==='GM_SOLICITADA'&&enCalificacion&&!venta.FECHA_FIRMA) || (estado==='FIRMADO'&&enCalificacion&&!venta.GM_SOLICITADA) || (estado==='DOCS_OBSERVADOS'&&areaObs==='NOTARÍA') || (estado==='DOCS_SUBSANADOS'&&areaObs==='NOTARÍA'))
  if (rol === 'legal') return ((!!venta.GM_SOLICITADA&&!venta.GM_LEVANTADA) || (estado==='DOCS_OBSERVADOS'&&areaObs==='LEGAL') || (estado==='DOCS_SUBSANADOS'&&areaObs==='LEGAL') || estado==='CONTENIDO_OBSERVADO')
  return false
}

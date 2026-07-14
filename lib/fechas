// lib/fechas.js — Utilidades de fecha ancladas a America/Lima.
// Perú usa UTC-5 todo el año (sin horario de verano), lo que permite
// construir instantes con offset explícito -05:00 de forma segura.
//
// REGLA: nunca usar `new Date("yyyy-MM-dd")` suelto (se interpreta como UTC
// y desplaza el día según la zona del dispositivo).

const TZ = 'America/Lima'

// "hoy" en Lima, en formato ISO yyyy-MM-dd
export function hoyISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

// Desplaza una fecha ISO (yyyy-MM-dd) en N días, tratándola como fecha pura.
export function desplazarISO(iso, dias) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''))
  if (!m) return ''
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}
export const ayerISO   = () => desplazarISO(hoyISO(), -1)
export const mananaISO = () => desplazarISO(hoyISO(),  1)

// Instante real (UTC) de una cita expresada en hora de pared de Lima.
export function instanteLima(fechaISO, hora) {
  if (!fechaISO || !hora) return null
  const h = hora.length === 5 ? hora + ':00' : hora
  const t = new Date(`${fechaISO}T${h}-05:00`)
  return isNaN(t.getTime()) ? null : t
}

// "Ahora" en Lima como { dow: 0-6 (0=Dom), mins: minutos desde medianoche }
export function ahoraLima() {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date())
  const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const dow = wd[p.find(x => x.type === 'weekday').value] ?? 0
  const hh  = Number(p.find(x => x.type === 'hour').value) % 24
  const mm  = Number(p.find(x => x.type === 'minute').value)
  return { dow, mins: hh * 60 + mm }
}

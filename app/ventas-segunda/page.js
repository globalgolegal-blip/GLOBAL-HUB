'use client'
// app/ventas-segunda/page.js
// Comercial accede SIN PIN — ve cards y puede agendar citas.
// Tesorería / Notaría / Legal se identifican con PIN para acciones elevadas.

import { useState, useEffect, useCallback } from 'react'
import { autenticarVS } from '../../lib/auth'
import { parsearVentas } from '../../lib/ventas-segunda/parseSheets'
import { derivarEstadoVS, ESTADO_CONFIG_VS, tienePendienteParaRol } from '../../lib/ventas-segunda/utils'
import VentaList from './components/VentaList'

const VS_SCRIPT_URL = process.env.NEXT_PUBLIC_VS_SCRIPT_URL
const NAVY = '#1A2238'

// Slots de agenda: cada 15 min dentro de los rangos permitidos
// Lun–Vie: mañana 09:15–12:30 · tarde 14:15–16:30
// Sábado : mañana 09:15–11:45 (un solo bloque)
const SLOTS_MANANA = [] // Lun–Vie mañana
const SLOTS_TARDE = [] // Lun–Vie tarde
const SLOTS_SAB = [] // Sábado
const _slot = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
for (let m = 555; m <= 750; m += 15) SLOTS_MANANA.push(_slot(m))
for (let m = 855; m <= 990; m += 15) SLOTS_TARDE.push(_slot(m))
for (let m = 555; m <= 705; m += 15) SLOTS_SAB.push(_slot(m))

function formatFechaLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function labelDia(fecha) {
  const hoy = formatFechaLocal(new Date())
  const manana = formatFechaLocal(new Date(Date.now() + 86400000))
  const ayer = formatFechaLocal(new Date(Date.now() - 86400000))
  const d = new Date(fecha + 'T12:00:00')
  const semana = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const base = `${semana[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`
  if (fecha === hoy) return `Hoy — ${base}`
  if (fecha === manana) return `Mañana — ${base}`
  if (fecha === ayer) return `Ayer — ${base}`
  return base
}

export default function VentasSegundaPage() {
  const [usuario, setUsuario] = useState(null)
  const [mostrarLogin, setLogin] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [actualizando, setActualizando] = useState(false)
  const [errorData, setErrorData] = useState(null)
  const [ultimaAct, setUltimaAct] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState(null)
  const [vista, setVista] = useState('lista')
  const [fechaAgenda, setFechaAgenda] = useState(formatFechaLocal(new Date()))

  const cargarVentas = useCallback(async (esInicial = false) => {
    if (!VS_SCRIPT_URL) { setErrorData('Variable NEXT_PUBLIC_VS_SCRIPT_URL no configurada.'); return }
    if (esInicial) setCargando(true)
    else setActualizando(true)
    setErrorData(null)
    try {
      const [resVentas, resGM] = await Promise.all([
        fetch(VS_SCRIPT_URL, { cache: 'no-store' }),
        fetch(`${VS_SCRIPT_URL}?action=get_gm_table`, { cache: 'no-store' }),
      ])
      if (!resVentas.ok) throw new Error(`Error HTTP ${resVentas.status}`)
      const data = await resVentas.json()
      if (data && data.ok === false) throw new Error(data.error || 'Error en el servidor')
      const filas =

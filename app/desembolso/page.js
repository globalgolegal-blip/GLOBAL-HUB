'use client'
import { useState, useEffect, useCallback } from 'react'
import MetaCard from '../../components/MetaCard'
import ContractList from '../../components/ContractList'
import { parsearSheet } from '../../lib/parseSheets'
import { derivarEstado, estadoParaVista, hoyISO, ESTADO_CONFIG } from '../../lib/utils'
import { getRegionDeCiudad, getDeptoDeciudad, ciudadesDeRegion } from '../../lib/regions'
import Icon from '../../components/Icon'
import { cargarJSON } from '../../lib/common/http'
const AC_PIN = '159753'
const LEGAL_PIN = '4815926'
const CATEGORIAS = [
{ key: 'PENDIENTE', label: 'Contratos por firmar', short: 'Por firmar', color: '#185FA5' },
{ key: 'INGRESADO', label: 'Contratos emitidos', short: 'Emitidos', color: '#534AB7' },
{ key: 'CONTRATO_OBSERVADO', label: 'Contratos observados', short: 'Observados', color: '#BA7517' },
{ key: 'VALIDADO', label: 'Firmas validadas', short: 'Validadas', color: '#0F6E56' },
{ key: 'OBSERVADO', label: 'Firmas observadas', short: 'Firmas obs.', color: '#D85A30' },
{ key: 'VENCIDO', label: 'Contratos vencidos', short: 'Vencidos', color: '#A32D2D' },
]
const COL_FECHA = {
  PENDIENTE: 'FECHA DE ENVÍO',
  INGRESADO: 'FECHA DE ENVÍO',
  CONTRATO_OBSERVADO: 'FECHA DE OBSERVACION',
  VALIDADO: 'FECHA DE VALIDACION',
  OBSERVADO: 'FECHA DE OBSERVACION',
  VENCIDO: 'FECHA DE VENCIMIENTO',
}
function getFechaEnvio(c) {
  return c['FECHA DE ENVÍO'] || c['FECHA DE ENVIO'] || ''
}
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fechaHoyStr() { return fmtDate(new Date()) }
function fechaAyerStr() {
  const a = new Date(); a.setDate(a.getDate() - 1)
  return fmtDate(a)
}
function getLapsoDefault() {
  return new Date().getHours() < 12 ? 'ayer' : 'hoy'
}
function getFechaDefault() {
  return getLapsoDefault() === 'ayer' ? fechaAyerStr() : fechaHoyStr()
}
function normalizarFecha(val) {
  const s = String(val || '').trim()
  if (!s) return ''
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const p = s.split('/')
    return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`
  }
  const d = new Date(s)
  if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return ''
}
function isVencidoAyerPage(val) {
  if (!val) return false
  const s = String(val).trim()
  let d
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const p = s.split('/')
    d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]))
  } else { d = new Date(s) }
  if (isNaN(d)) return false
  const ayer = new Date()
  ayer.setHours(0, 0, 0, 0)
  ayer.setDate(ayer.getDate() - 1)
  return d.getFullYear() === ayer.getFullYear()
    && d.getMonth() === ayer.getMonth()
    && d.getDate() === ayer.getDate()
}
export default function Dashboard() {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [meta, setMeta] = useState(null)
  const [contratos, setContratos] = useState([])
  const [ultimaAct, setUltimaAct] = useState(null)
  const [categoriaActiva, setCategoriaActiva] = useState('PENDIENTE')
  const [lapsoActivo, setLapsoActivo] = useState(getLapsoDefault)
  const [lapsoModificado, setLapsoModificado] = useState(false)
  const [fechaDesde, setFechaDesde] = useState(getFechaDefault)
  const [fechaHasta, setFechaHasta] = useState(getFechaDefault)
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false)
  const [regionActiva, setRegionActiva] = useState(null)
  const [ciudadActiva, setCiudadActiva] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [errorSolicitud, setErrorSolicitud] = useState(null)
  const [acAutenticado, setAcAutenticado] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [mostrarPin, setMostrarPin] = useState(false)
  const [pinError, setPinError] = useState(false)
  const [legalAutenticado, setLegalAutenticado] = useState(false)
  const [pinLegalInput, setPinLegalInput] = useState('')
  const [mostrarPinLegal, setMostrarPinLegal] = useState(false)
  const [pinLegalError, setPinLegalError] = useState(false)
  const [busquedaLegal, setBusquedaLegal] = useState('')
  const [regionLegal, setRegionLegal] = useState(null)
  const [ciudadLegal, setCiudadLegal] = useState(null)
  const SHEET_URL = 'https://script.google.com/macros/s/AKfycbxE8kT5hBbav2OT-kiCSj3jz2xg_XW2v0y3DkUwHRBTAaaI0AgPTVHpbzL-_rHI9hhNHw/exec' // ✅ CORREGIDO: V24 (era V15)
  const cargarDatos = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      // El reintento ante 404/5xx (arranque en frío del Apps Script) vive en cargarJSON.
      const filas = await cargarJSON(`${SHEET_URL}?_t=${Date.now()}`)
      const { meta: metaParsed, contratos: contratosParsed } = parsearSheet(filas)
      const contratosConEstado = contratosParsed.map(c => {
        const est = derivarEstado(c)
        return {
          ...c,
          _estado: est,
          _estadoVista: estadoParaVista(est, c), // estado público (sin PIN Legal)
          _region: c['REGION'] || getRegionDeCiudad(c['CIUDAD']),
          _depto: c['DEPARTAMENTO'] || getDeptoDeciudad(c['CIUDAD']),
        }
      })
      setMeta(metaParsed)
      setContratos(contratosConEstado)
      setUltimaAct(new Date())
    } catch (err) {
      setError('Error al cargar: ' + err.message)
    } finally {
      setCargando(false)
    }
  }, [])
  useEffect(() => { cargarDatos() }, [cargarDatos])
  const solicitarValidacion = useCallback(async (id) => {
    setErrorSolicitud(null)
    try {
      const url = `${SHEET_URL}?accion=solicitar&id=${encodeURIComponent(id)}`
      const res = await fetch(url)
      const data = await res.json()
      if (!data.ok) {
        setErrorSolicitud('No se pudo enviar la solicitud. Intenta nuevamente.')
        return
      }
      await cargarDatos()
    } catch (err) {
      setErrorSolicitud('Error de conexión: ' + err.message)
    }
  }, [cargarDatos])
  const solicitarReenvio = useCallback(async (id) => {
    setErrorSolicitud(null)
    try {
      const url = `${SHEET_URL}?accion=reenviar&id=${encodeURIComponent(id)}`
      const res = await fetch(url)
      const data = await res.json()
      if (!data.ok) {
        setErrorSolicitud('No se pudo registrar el reenvio. Intenta nuevamente.')
        return
      }
      await cargarDatos()
    } catch (err) {
      setErrorSolicitud('Error de conexion: ' + err.message)
    }
  }, [cargarDatos])
  const solicitarReenvioVencido = useCallback(async (id) => {
    setErrorSolicitud(null)
    try {
      const url = `${SHEET_URL}?accion=reenviar_vencido&id=${encodeURIComponent(id)}`
      const res = await fetch(url)
      const data = await res.json()
      if (!data.ok) {
        setErrorSolicitud('No se pudo registrar el reenvio. Intenta nuevamente.')
        return
      }
      await cargarDatos()
    } catch (err) {
      setErrorSolicitud('Error de conexion: ' + err.message)
    }
  }, [cargarDatos])
  const legalValidar = useCallback(async (id) => {
    setErrorSolicitud(null)
    try {
      const res = await fetch(`${SHEET_URL}?accion=validar&id=${encodeURIComponent(id)}`)
      const data = await res.json()
      if (!data.ok) { setErrorSolicitud('No se pudo validar. Intenta nuevamente.'); return }
      await cargarDatos()
    } catch (err) { setErrorSolicitud('Error de conexion: ' + err.message) }
  }, [cargarDatos])
  const legalObservar = useCallback(async (id, motivo) => {
    setErrorSolicitud(null)
    try {
      const url = `${SHEET_URL}?accion=observar&id=${encodeURIComponent(id)}&motivo=${encodeURIComponent(motivo || '')}`
      const res = await fetch(url)
      const data = await res.json()
      if (!data.ok) { setErrorSolicitud('No se pudo observar. Intenta nuevamente.'); return }
      await cargarDatos()
    } catch (err) { setErrorSolicitud('Error de conexion: ' + err.message) }
  }, [cargarDatos])
  const legalCompletarJotform = useCallback(async (id) => {
    setErrorSolicitud(null)
    try {
      const res = await fetch(`${SHEET_URL}?accion=completar_jotform&id=${encodeURIComponent(id)}`)
      const data = await res.json()
      if (!data.ok) { setErrorSolicitud('No se pudo completar. Intenta nuevamente.'); return }
      await cargarDatos()
    } catch (err) { setErrorSolicitud('Error de conexion: ' + err.message) }
  }, [cargarDatos])
  const legalMarcarPendiente = useCallback(async (id) => {
    setErrorSolicitud(null)
    try {
      const res = await fetch(`${SHEET_URL}?accion=marcar_pendiente&id=${encodeURIComponent(id)}`)
      const data = await res.json()
      if (!data.ok) { setErrorSolicitud('No se pudo marcar como pendiente. Intenta nuevamente.'); return }
      await cargarDatos()
    } catch (err) { setErrorSolicitud('Error de conexion: ' + err.message) }
  }, [cargarDatos])
  const legalConfirmarReenvio = useCallback(async (id) => {
    setErrorSolicitud(null)
    try {
      const res = await fetch(`${SHEET_URL}?accion=confirmar_reenvio&id=${encodeURIComponent(id)}`)
      const data = await res.json()
      if (!data.ok) { setErrorSolicitud('No se pudo confirmar el reenvio. Intenta nuevamente.'); return }
      await cargarDatos()
    } catch (err) { setErrorSolicitud('Error de conexion: ' + err.message) }
  }, [cargarDatos])
  const legalReenviarVencido = useCallback(async (id, nuevaFecha) => {
    setErrorSolicitud(null)
    try {
      const url = `${SHEET_URL}?accion=reenviar_vencido_legal&id=${encodeURIComponent(id)}&nueva_fecha=${encodeURIComponent(nuevaFecha)}`
      const res = await fetch(url)
      const data = await res.json()
      if (!data.ok) { setErrorSolicitud('No se pudo procesar el reenvio vencido. Intenta nuevamente.'); return }
      await cargarDatos()
    } catch (err) { setErrorSolicitud('Error de conexion: ' + err.message) }
  }, [cargarDatos])
  function verificarPin() {
    if (pinInput === AC_PIN) {
      setAcAutenticado(true)
      setMostrarPin(false)
      setPinInput('')
      setPinError(false)
    } else {
      setPinError(true)
    }
  }
  function verificarPinLegal() {
    if (pinLegalInput === LEGAL_PIN) {
      setLegalAutenticado(true)
      setMostrarPinLegal(false)
      setPinLegalInput('')
      setPinLegalError(false)
    } else {
      setPinLegalError(true)
    }
  }
  const aplicarLapso = useCallback((lapso) => {
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate()-1)
    if (lapso === 'hoy') { setFechaDesde(fmtDate(hoy)); setFechaHasta(fmtDate(hoy)) }
    if (lapso === 'ayer') { setFechaDesde(fmtDate(ayer)); setFechaHasta(fmtDate(ayer)) }
    if (lapso === 'personalizado') { setFechaDesde(''); setFechaHasta('') }
    setLapsoActivo(lapso)
    setLapsoModificado(true)
    setMostrarPersonalizado(lapso === 'personalizado')
  }, [])
  function esEmitido(c) {
    return !!normalizarFecha(getFechaEnvio(c)) && c._estado !== 'CONTRATO_OBSERVADO'
  }
  function matchFecha(c, colFecha) {
    if (!fechaDesde && !fechaHasta) return true
    const rawVal = (colFecha === 'FECHA DE ENVÍO' || colFecha === 'FECHA DE ENVIO')
      ? getFechaEnvio(c)
      : (c[colFecha] || '')
    const fechaISO = normalizarFecha(rawVal)
    if (!fechaISO) return false
    if (fechaDesde && fechaISO < fechaDesde) return false
    if (fechaHasta && fechaISO > fechaHasta) return false
    return true
  }
  function matchLugar(c) {
    if (ciudadActiva) return (c['CIUDAD'] || '').toUpperCase() === ciudadActiva.toUpperCase()
    if (regionActiva) return c._region === regionActiva
    return true
  }
  const counts = CATEGORIAS.reduce((acc, cat) => {
    if (cat.key === 'INGRESADO') {
      acc[cat.key] = contratos.filter(c =>
        esEmitido(c) && matchFecha(c, 'FECHA DE ENVÍO') && matchLugar(c)
      ).length
    } else if (cat.key === 'PENDIENTE') {
      // ✅ CORREGIDO: OBSERVADO_SISTEMA va a OBSERVADO (vía _estadoVista), no a PENDIENTE
      acc[cat.key] = contratos.filter(c =>
        (c._estado === 'PENDIENTE' || c._estado === 'SOLICITADO') && matchLugar(c)
      ).length
    } else if (cat.key === 'VENCIDO') {
      if (lapsoActivo === 'hoy') {
        acc[cat.key] = contratos.filter(c => {
          const fv = normalizarFecha(c['FECHA DE VENCIMIENTO'])
          const firma = String(c['CONTRATO FIRMADO CONFORME'] || '').trim().toUpperCase()
          return fv === fechaHoyStr() && firma !== 'SI' && firma !== 'VENCIDO' && matchLugar(c)
        }).length
      } else {
        acc[cat.key] = contratos.filter(c =>
          c._estado === 'VENCIDO' &&
          matchFecha(c, 'FECHA DE VENCIMIENTO') &&
          matchLugar(c)
        ).length
      }
    } else {
      acc[cat.key] = contratos.filter(c =>
        (c._estadoVista || c._estado) === cat.key &&
        matchFecha(c, COL_FECHA[cat.key] || 'FECHA DE ENVÍO') &&
        matchLugar(c)
      ).length
    }
    return acc
  }, {})
  const contratosFiltrados = contratos.filter(c => {
    if (categoriaActiva === 'PENDIENTE') {
      // ✅ CORREGIDO: OBSERVADO_SISTEMA no se muestra en PENDIENTE para el operador
      if (c._estado !== 'PENDIENTE' && c._estado !== 'SOLICITADO') return false
      if (ciudadActiva && (c['CIUDAD'] || '').toUpperCase() !== ciudadActiva.toUpperCase()) return false
      if (regionActiva && c._region !== regionActiva) return false
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase()
        const nombre = (c['CLIENTE'] || '').toLowerCase()
        const doi = String(c['DOI'] || '').toLowerCase()
        if (!nombre.includes(q) && !doi.includes(q)) return false
      }
      return true
    } else if (categoriaActiva === 'INGRESADO') {
      if (!esEmitido(c)) return false
    } else if (categoriaActiva === 'VENCIDO') {
      const fv = normalizarFecha(c['FECHA DE VENCIMIENTO'])
      const firma = String(c['CONTRATO FIRMADO CONFORME'] || '').trim().toUpperCase()
      if (lapsoActivo === 'hoy') {
        if (fv !== fechaHoyStr()) return false
        if (firma === 'SI' || firma === 'VENCIDO') return false
      } else {
        if (c._estado !== 'VENCIDO') return false
        if ((fechaDesde || fechaHasta) && !matchFecha(c, 'FECHA DE VENCIMIENTO')) return false
      }
    } else {
      // OBSERVADO_SISTEMA → _estadoVista = OBSERVADO → aparece en tab OBSERVADO ✓
      if ((c._estadoVista || c._estado) !== categoriaActiva) return false
    }
    if (categoriaActiva !== 'PENDIENTE' && categoriaActiva !== 'VENCIDO' && (fechaDesde || fechaHasta)) {
      const colFecha = categoriaActiva === 'INGRESADO'
        ? 'FECHA DE ENVÍO'
        : (COL_FECHA[categoriaActiva] || 'FECHA DE ENVÍO')
      if (!matchFecha(c, colFecha)) return false
    }
    if (ciudadActiva) {
      if ((c['CIUDAD'] || '').toUpperCase() !== ciudadActiva.toUpperCase()) return false
    } else if (regionActiva) {
      if (c._region !== regionActiva) return false
    }
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      const nombre = (c['CLIENTE'] || '').toLowerCase()
      const doi = String(c['DOI'] || '').toLowerCase()
      if (!nombre.includes(q) && !doi.includes(q)) return false
    }
    return true
  })
  const contratosLegal = contratos.filter(c => {
    const solV = String(c['SOLICITUD'] || '').toUpperCase()
    const est = c._estado
    if (est === 'SOLICITADO') return true
    if (est === 'VENCIDO' && isVencidoAyerPage(c['FECHA DE VENCIMIENTO'])) return true
    if (est === 'VENCIDO' && solV.startsWith('REENVIAR_VENCIDO')) return true
    if (est === 'OBSERVADO' && solV.startsWith('REENVIAR') && !solV.startsWith('REENVIAR_VENCIDO')) return true
    if (est === 'PENDIENTE_JOTFORM') return true // Legal debe subir JotForm
    if (est === 'OBSERVADO_SISTEMA') return true  // Legal debe revisar observación
    return false
  })
  const ciudadesRegionLegal = regionLegal ? ciudadesDeRegion(regionLegal) : []
  const contratosLegalFiltrados = contratosLegal.filter(c => {
    if (ciudadLegal) {
      if ((c['CIUDAD'] || '').toUpperCase() !== ciudadLegal.toUpperCase()) return false
    } else if (regionLegal) {
      if (c._region !== regionLegal) return false
    }
    if (!busquedaLegal.trim()) return true
    const q = busquedaLegal.trim().toLowerCase()
    const nombre = (c['CLIENTE'] || '').toLowerCase()
    const doi = String(c['DOI'] || '').toLowerCase()
    return nombre.includes(q) || doi.includes(q)
  })
  const horaAct = ultimaAct
    ? ultimaAct.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : null
  const totalValidados = contratos.filter(c => c._estado === 'VALIDADO').length
  const ciudadesRegion = regionActiva ? ciudadesDeRegion(regionActiva) : []
  const categoriaLabel = CATEGORIAS.find(c => c.key === categoriaActiva)?.label || ''
  const plazoLabel = lapsoActivo === 'hoy' ? 'HOY'
    : lapsoActivo === 'ayer' ? 'AYER'
    : (fechaDesde && fechaHasta)
      ? `${fechaDesde.split('-').reverse().join('/')} – ${fechaHasta.split('-').reverse().join('/')}`
      : fechaDesde
        ? `DESDE ${fechaDesde.split('-').reverse().join('/')}`
        : ''
  const plazoEfectivo = categoriaActiva === 'PENDIENTE' ? 'TOTAL' : plazoLabel
  const regionLabel = ciudadActiva || regionActiva || 'TODAS'
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F1EFE8' }}>
      <header style={{ backgroundColor: '#1A2238' }} className="px-4 pt-6 pb-5">
        <div className="max-w-lg mx-auto">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '500', color: 'white', lineHeight: 1.1 }}>GoTrack</div>
              <div style={{ fontSize: '11px', color: '#9BB4D8' }}>
                {`Desembolso${horaAct ? ' · ' + horaAct : ''}`}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                onClick={() => { setMostrarPin(v => !v); setPinError(false); setPinInput(''); setMostrarPinLegal(false) }}
                title={acAutenticado ? 'AC autenticado' : 'Acceso AC'} aria-label="Acceso Atención al Cliente"
                style={{ color: acAutenticado ? '#4A90D9' : '#9BB4D8', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', padding: 0 }}
              >
                <Icon name="lock" size={19} />
              </button>
              <button
                onClick={() => { setMostrarPinLegal(v => !v); setPinLegalError(false); setPinLegalInput(''); setMostrarPin(false) }}
                title={legalAutenticado ? 'Modo Legal activo' : 'Acceso Equipo Legal'} aria-label="Acceso Equipo Legal"
                style={{ color: legalAutenticado ? '#4DC987' : '#9BB4D8', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', padding: 0 }}
              >
                <Icon name="scale" size={19} />
              </button>
              <button onClick={cargarDatos} title="Actualizar" aria-label="Actualizar"
                style={{ color: '#9BB4D8', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', padding: 0 }}>
                <Icon name="refresh" size={19} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '18px', marginTop: '12px' }}>
            <span style={{ color: '#fff', fontSize: '12px', paddingBottom: '6px', borderBottom: '2px solid #fff' }}>Desembolso</span>
            <a href="/ventas-segunda" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#9BB4D8', fontSize: '12px', textDecoration: 'none', paddingBottom: '6px', borderBottom: '2px solid transparent' }}>
              Ventas de segunda <Icon name="arrow-right" size={14} />
            </a>
                <a href="https://globalgo-levantamiento-gm.vercel.app/?v=final"
  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#9BB4D8', fontSize: '12px', textDecoration: 'none', paddingBottom: '6px', borderBottom: '2px solid transparent' }}>
  Levantamiento <Icon name="arrow-right" size={14} />
</a>
          </div>
          {mostrarPin && !acAutenticado && (
            <div style={{ marginTop: '12px', background: '#243050', borderRadius: '10px', padding: '12px 14px' }}>
              <p style={{ fontSize: '11px', color: '#9BB4D8', marginBottom: '8px', fontWeight: '500' }}>
                {'Acceso Atencion al Cliente'}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  value={pinInput}
                  onChange={e => { setPinInput(e.target.value); setPinError(false) }}
                  onKeyDown={e => e.key === 'Enter' && verificarPin()}
                  placeholder="PIN"
                  maxLength={10}
                  style={{
                    flex: 1, fontSize: '14px', padding: '8px 12px',
                    borderRadius: '8px', border: pinError ? '1px solid #F09595' : '0.5px solid #4A5568',
                    background: '#1A2238', color: 'white', outline: 'none',
                    letterSpacing: '4px',
                  }}
                />
                <button
                  onClick={verificarPin}
                  style={{
                    fontSize: '12px', fontWeight: '500', padding: '8px 16px',
                    borderRadius: '8px', background: '#4A90D9', color: 'white',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  OK
                </button>
              </div>
              {pinError && (
                <p style={{ fontSize: '11px', color: '#F09595', marginTop: '6px' }}>
                  {'PIN incorrecto'}
                </p>
              )}
            </div>
          )}
          {acAutenticado && mostrarPin && (
            <div style={{ marginTop: '12px', background: '#243050', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#4A90D9', fontWeight: '500' }}>{'AC autenticado'}</span>
              <button
                onClick={() => { setAcAutenticado(false); setMostrarPin(false) }}
                style={{ fontSize: '11px', color: '#9BB4D8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {'Cerrar sesion'}
              </button>
            </div>
          )}
          {mostrarPinLegal && !legalAutenticado && (
            <div style={{ marginTop: '12px', background: '#0F2D1E', borderRadius: '10px', padding: '12px 14px', border: '0.5px solid #1A6B47' }}>
              <p style={{ fontSize: '11px', color: '#4DC987', marginBottom: '8px', fontWeight: '500' }}>
                {'Acceso Equipo Legal'}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  value={pinLegalInput}
                  onChange={e => { setPinLegalInput(e.target.value); setPinLegalError(false) }}
                  onKeyDown={e => e.key === 'Enter' && verificarPinLegal()}
                  placeholder="PIN"
                  maxLength={10}
                  style={{
                    flex: 1, fontSize: '14px', padding: '8px 12px',
                    borderRadius: '8px', border: pinLegalError ? '1px solid #F09595' : '0.5px solid #1A6B47',
                    background: '#0A1F12', color: 'white', outline: 'none',
                    letterSpacing: '4px',
                  }}
                />
                <button
                  onClick={verificarPinLegal}
                  style={{
                    fontSize: '12px', fontWeight: '500', padding: '8px 16px',
                    borderRadius: '8px', background: '#1A6B47', color: 'white',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  OK
                </button>
              </div>
              {pinLegalError && (
                <p style={{ fontSize: '11px', color: '#F09595', marginTop: '6px' }}>
                  {'PIN incorrecto'}
                </p>
              )}
            </div>
          )}
          {legalAutenticado && mostrarPinLegal && (
            <div style={{ marginTop: '12px', background: '#0F2D1E', borderRadius: '10px', padding: '10px 14px', border: '0.5px solid #1A6B47', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#4DC987', fontWeight: '500' }}>{'Modo Legal activo'}</span>
              <button
                onClick={() => { setLegalAutenticado(false); setMostrarPinLegal(false) }}
                style={{ fontSize: '11px', color: '#6BCB99', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {'Cerrar sesion'}
              </button>
            </div>
          )}
        </div>
      </header>
      <div style={{ background: 'white', borderBottom: '0.5px solid #E8E6DF' }}>
        <div className="max-w-lg mx-auto" style={{ padding: '8px 16px' }}>
          <a href="https://gobot-leg.github.io/GOBOT/gobot_faq_74.html" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#E6F1FB', color: '#185FA5',
              border: 'none', borderRadius: '20px', padding: '5px 12px', fontSize: '12px', fontWeight: '500', textDecoration: 'none' }}>
            <Icon name="robot" size={16} /> GoBot · Guía comercial
          </a>
        </div>
      </div>
      <main className="max-w-lg mx-auto pb-10" style={{ padding: '12px 12px 40px' }}>
        {cargando && (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 rounded-full animate-spin mb-3"
              style={{ border: '4px solid #1A2238', borderTopColor: 'transparent' }} />
            <p style={{ fontSize: '14px', color: '#888780' }}>Cargando contratos...</p>
          </div>
        )}
        {error && (
          <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: '12px', padding: '16px', fontSize: '14px', color: '#791F1F', marginBottom: '12px' }}>
            <strong>Error:</strong> {error}
            <br />
            <button onClick={cargarDatos} style={{ marginTop: '8px', textDecoration: 'underline', color: '#A32D2D' }}>
              Reintentar
            </button>
          </div>
        )}
        {errorSolicitud && (
          <div style={{ background: '#FAEEDA', border: '0.5px solid #BA7517', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#BA7517', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{errorSolicitud}</span>
            <button onClick={() => setErrorSolicitud(null)} style={{ color: '#BA7517', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>&#x2715;</button>
          </div>
        )}
        {!cargando && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* ── MODO LEGAL ── */}
            {legalAutenticado && (
              <>
                <div style={{ background: '#1A3D2B', borderRadius: '12px', padding: '12px 14px', border: '0.5px solid #2A7A50' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#4DC987', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    {'MODO LEGAL'}
                  </p>
                  <p style={{ fontSize: '11px', color: '#6BCB99' }}>
                    {`${contratosLegal.length} contrato${contratosLegal.length !== 1 ? 's' : ''} requieren atencion legal`}
                  </p>
                </div>
                <div style={{ position: 'relative' }}>
                  <svg
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#888780', pointerEvents: 'none' }}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                  </svg>
                  <input
                    type="text"
                    value={busquedaLegal}
                    onChange={e => setBusquedaLegal(e.target.value)}
                    placeholder="Buscar por nombre o DOI..."
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      paddingLeft: '32px', paddingRight: busquedaLegal ? '32px' : '12px',
                      paddingTop: '8px', paddingBottom: '8px',
                      fontSize: '12px', color: '#444441',
                      background: '#F1EFE8', border: '0.5px solid #D3D1C7',
                      borderRadius: '10px', outline: 'none',
                    }}
                  />
                  {busquedaLegal && (
                    <button
                      onClick={() => setBusquedaLegal('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888780', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>
                      &#x2715;
                    </button>
                  )}
                </div>
                <div style={{ background: 'white', borderRadius: '12px', padding: '10px 14px', border: '0.5px solid #D3D1C7' }}>
                  <p style={{ fontSize: '10px', fontWeight: '600', color: '#5F5E5A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                    {'Región / Ciudad'}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      { key: null, label: 'Todas' },
                      { key: 'LIMA METROPOLITANA', label: 'Lima Met.' },
                      { key: 'NORTE', label: 'Norte' },
                      { key: 'SUR', label: 'Sur' },
                      { key: 'ORIENTE', label: 'Oriente' },
                      { key: 'CENTRO', label: 'Centro' },
                    ].map(r => (
                      <button key={r.label}
                        onClick={() => { setRegionLegal(r.key); setCiudadLegal(null) }}
                        style={{
                          fontSize: '11px', padding: '4px 12px', borderRadius: '20px',
                          background: regionLegal === r.key ? '#1A6B47' : 'white',
                          color: regionLegal === r.key ? 'white' : '#1A2238',
                          border: regionLegal === r.key ? '0.5px solid #1A6B47' : '0.5px solid #B4B2A9',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {ciudadesRegionLegal.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {ciudadesRegionLegal.map(ciudad => (
                        <button key={ciudad}
                          onClick={() => setCiudadLegal(ciudadLegal === ciudad ? null : ciudad)}
                          style={{
                            fontSize: '10px', padding: '3px 10px', borderRadius: '20px',
                            background: ciudadLegal === ciudad ? '#2A7A50' : '#F1EFE8',
                            color: ciudadLegal === ciudad ? 'white' : '#444441',
                            border: ciudadLegal === ciudad ? '0.5px solid #2A7A50' : '0.5px solid #D3D1C7',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}>
                          {ciudad}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {contratosLegal.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', background: 'white', borderRadius: '12px', border: '0.5px solid #D3D1C7' }}>
                    <p style={{ fontSize: '14px', color: '#888780' }}>{'Sin contratos pendientes de accion legal'}</p>
                  </div>
                ) : contratosLegalFiltrados.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', background: 'white', borderRadius: '12px', border: '0.5px solid #D3D1C7' }}>
                    <p style={{ fontSize: '14px', color: '#888780' }}>
                      {busquedaLegal.trim()
                        ? `Sin resultados para "${busquedaLegal}"`
                        : ciudadLegal
                          ? `Sin contratos pendientes en ${ciudadLegal}`
                          : `Sin contratos pendientes en ${regionLegal}`
                      }
                    </p>
                  </div>
                ) : (
                  <ContractList
                    contratos={contratosLegalFiltrados}
                    onSolicitarValidacion={solicitarValidacion}
                    acAutenticado={acAutenticado}
                    onSolicitarReenvio={solicitarReenvio}
                    onSolicitarReenvioVencido={solicitarReenvioVencido}
                    legalAutenticado={legalAutenticado}
                    onLegalValidar={legalValidar}
                    onLegalObservar={legalObservar}
                    onCompletarJotform={legalCompletarJotform}
                    onLegalMarcarPendiente={legalMarcarPendiente}
                    onLegalConfirmarReenvio={legalConfirmarReenvio}
                    onLegalReenviarVencido={legalReenviarVencido}
                  />
                )}
              </>
            )}
            {/* ── VISTA NORMAL ── */}
            {!legalAutenticado && (<>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {CATEGORIAS.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setCategoriaActiva(cat.key)}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      textAlign: 'left',
                      border: categoriaActiva === cat.key ? '2px solid #1A2238' : '0.5px solid #D3D1C7',
                      borderLeft: `4px solid ${cat.color}`,
                      cursor: 'pointer',
                      transition: 'border 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '24px', fontWeight: '500', color: '#1A2238', lineHeight: '1' }}>
                      {counts[cat.key] || 0}
                    </div>
                    <div style={{ marginTop: '3px', fontSize: '12px', color: cat.color, lineHeight: '1.3' }}>
                      {cat.short}
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '12px 14px', border: '0.5px solid #D3D1C7' }}>
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#888780' }}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                  </svg>
                  <input
                    type="text"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre o DOI..."
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      paddingLeft: '32px', paddingRight: busqueda ? '32px' : '12px',
                      paddingTop: '8px', paddingBottom: '8px',
                      fontSize: '12px', color: '#444441',
                      background: '#F1EFE8', border: '0.5px solid #D3D1C7',
                      borderRadius: '10px', outline: 'none',
                    }}
                  />
                  {busqueda && (
                    <button onClick={() => setBusqueda('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888780', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>
                      &#x2715;
                    </button>
                  )}
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '500', color: '#5F5E5A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    Plazo
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      { id: 'hoy', label: 'Hoy' },
                      { id: 'ayer', label: 'Ayer' },
                      { id: 'personalizado', label: 'Personalizado' },
                    ].map(({ id, label }) => (
                      <button key={id} onClick={() => aplicarLapso(id)}
                        style={{
                          fontSize: '12px', padding: '5px 12px', borderRadius: '20px',
                          background: lapsoActivo === id ? '#1A2238' : 'white',
                          color: lapsoActivo === id ? 'white' : '#1A2238',
                          border: lapsoActivo === id ? '0.5px solid #1A2238' : '0.5px solid #B4B2A9',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {mostrarPersonalizado && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                      <input type="date" value={fechaDesde} max={fechaHasta || hoyISO()}
                        onChange={e => setFechaDesde(e.target.value)}
                        style={{ flex: 1, fontSize: '11px', border: '0.5px solid #D3D1C7', borderRadius: '8px', padding: '6px 8px', outline: 'none' }} />
                      <span style={{ color: '#888780', fontSize: '12px' }}>&#x2013;</span>
                      <input type="date" value={fechaHasta} min={fechaDesde} max={hoyISO()}
                        onChange={e => setFechaHasta(e.target.value)}
                        style={{ flex: 1, fontSize: '11px', border: '0.5px solid #D3D1C7', borderRadius: '8px', padding: '6px 8px', outline: 'none' }} />
                    </div>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '500', color: '#5F5E5A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    {`Región / Ciudad`}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      { key: null, label: 'Todas' },
                      { key: 'LIMA METROPOLITANA', label: 'Lima Met.' },
                      { key: 'NORTE', label: 'Norte' },
                      { key: 'SUR', label: 'Sur' },
                      { key: 'ORIENTE', label: 'Oriente' },
                      { key: 'CENTRO', label: 'Centro' },
                    ].map(r => (
                      <button key={r.label} onClick={() => { setRegionActiva(r.key); setCiudadActiva(null) }}
                        style={{
                          fontSize: '12px', padding: '5px 12px', borderRadius: '20px',
                          background: regionActiva === r.key ? '#1A2238' : 'white',
                          color: regionActiva === r.key ? 'white' : '#1A2238',
                          border: regionActiva === r.key ? '0.5px solid #1A2238' : '0.5px solid #B4B2A9',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {ciudadesRegion.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {ciudadesRegion.map(ciudad => (
                        <button key={ciudad}
                          onClick={() => setCiudadActiva(ciudadActiva === ciudad ? null : ciudad)}
                          style={{
                            fontSize: '11px', padding: '4px 10px', borderRadius: '20px',
                            background: ciudadActiva === ciudad ? '#534AB7' : '#F1EFE8',
                            color: ciudadActiva === ciudad ? 'white' : '#444441',
                            border: ciudadActiva === ciudad ? '0.5px solid #534AB7' : '0.5px solid #D3D1C7',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}>
                          {ciudad}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 2px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#1A2238' }}>
                  {categoriaLabel}
                  <span style={{ fontWeight: '400', color: '#888780' }}>{` · ${plazoEfectivo}`}</span>
                  {regionLabel !== 'TODAS' && (
                    <span style={{ fontWeight: '400', color: '#888780' }}>{` · ${regionLabel}`}</span>
                  )}
                </span>
                <span style={{ fontSize: '12px', color: '#888780' }}>
                  {contratosFiltrados.length}{` contrato${contratosFiltrados.length !== 1 ? 's' : ''}`}
                </span>
              </div>
              <ContractList
                key={categoriaActiva + '-' + (ciudadActiva || '') + '-' + (regionActiva || '')}
                contratos={contratosFiltrados}
                onSolicitarValidacion={solicitarValidacion}
                acAutenticado={acAutenticado}
                onSolicitarReenvio={solicitarReenvio}
                onSolicitarReenvioVencido={solicitarReenvioVencido}
                legalAutenticado={legalAutenticado}
                onLegalValidar={legalValidar}
                onLegalObservar={legalObservar}
                onCompletarJotform={legalCompletarJotform}
                onLegalMarcarPendiente={legalMarcarPendiente}
                onLegalConfirmarReenvio={legalConfirmarReenvio}
                onLegalReenviarVencido={legalReenviarVencido}
              />
            </>)}
            {/* ── FOOTER ── */}
            <div style={{ textAlign: 'center', padding: '32px 16px 8px', borderTop: '0.5px solid #D3D1C7', marginTop: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: '600', color: '#1A2238', letterSpacing: '0.12em', marginBottom: '4px' }}>
                POWERED BY LEGAL TEAM GO
              </p>
              <p style={{ fontSize: '10px', color: '#5F5E5A', letterSpacing: '0.06em', marginBottom: '4px' }}>
                IMPULSADO POR EL EQUIPO LEGAL DE GO
              </p>
              <p style={{ fontSize: '10px', color: '#888780', letterSpacing: '0.06em', marginBottom: '16px' }}>
                GO EQUIPO LEGAL IMAYNA RUWASQAN
              </p>
              <div style={{ borderTop: '0.5px solid #E8E6DF', paddingTop: '14px', marginBottom: '14px', textAlign: 'left' }}>
                <p style={{ fontSize: '9px', fontWeight: '600', color: '#5F5E5A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  {'Bancos de Datos Personales · ANPD · Ley 29733'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ background: '#F7F6F2', borderRadius: '6px', padding: '7px 10px', border: '0.5px solid #E8E6DF' }}>
                    <p style={{ fontSize: '9px', fontWeight: '600', color: '#444441', marginBottom: '1px' }}>
                      {'Global Go S.A.C.'}
                    </p>
                    <p style={{ fontSize: '9px', color: '#888780' }}>
                      {'Cód. PJ-2026-2079 · Constancia INS-2026-2295 · RUC 20611596155'}
                    </p>
                  </div>
                  <div style={{ background: '#F7F6F2', borderRadius: '6px', padding: '7px 10px', border: '0.5px solid #E8E6DF' }}>
                    <p style={{ fontSize: '9px', fontWeight: '600', color: '#444441', marginBottom: '1px' }}>
                      {'Coop. de Ahorro y Crédito Promotora de Negocios y Servicios'}
                    </p>
                    <p style={{ fontSize: '9px', color: '#888780' }}>
                      {'Cód. PJ-2026-2095 · Constancia INS-2026-2312 · RUC 20523897048'}
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ borderTop: '0.5px solid #E8E6DF', paddingTop: '12px', marginBottom: '14px', textAlign: 'left' }}>
                <p style={{ fontSize: '9px', color: '#B4B2A9', lineHeight: '1.6' }}>
                  {'La información contenida en esta plataforma es de carácter confidencial y de uso exclusivo del personal autorizado de Global Go S.A.C. y de la Cooperativa de Ahorro y Crédito Promotora de Negocios y Servicios. Su acceso, reproducción o divulgación no autorizada está prohibida.'}
                </p>
              </div>
              <div style={{ borderTop: '0.5px solid #E8E6DF', paddingTop: '12px' }}>
                <p style={{ fontSize: '9px', color: '#B4B2A9', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  {`© ${new Date().getFullYear()} Global Go S.A.C. · Todos los derechos reservados`}
                </p>
                <p style={{ fontSize: '9px', color: '#6B7280', letterSpacing: '0.04em', marginBottom: '2px', fontWeight: '600' }}>
                  {'Desarrollado por Fernando Barzola y Juan Carlos Barrientos'}
                </p>
                <p style={{ fontSize: '9px', color: '#B4B2A9', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  {'Desarrollado con asistencia de Claude'}
                </p>
                <p style={{ fontSize: '9px', color: '#B4B2A9', letterSpacing: '0.04em' }}>
                  {'claude.ai · Anthropic'}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

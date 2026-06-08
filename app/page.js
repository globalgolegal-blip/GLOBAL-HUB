'use client'
import { useState, useEffect, useCallback } from 'react'
import MetaCard from '../components/MetaCard'
import ContractList from '../components/ContractList'
import { parsearSheet } from '../lib/parseSheets'
import { derivarEstado, hoyISO, ESTADO_CONFIG } from '../lib/utils'
import { getRegionDeCiudad, getDeptoDeciudad, ciudadesDeRegion } from '../lib/regions'
const AC_PIN = '159753'
const CATEGORIAS = [
  { key: 'PENDIENTE',          label: 'Contratos por firmar',  color: '#185FA5' },
  { key: 'INGRESADO',          label: 'Contratos emitidos',    color: '#534AB7' },
  { key: 'CONTRATO_OBSERVADO', label: 'Contratos observados',  color: '#BA7517' },
  { key: 'VALIDADO',           label: 'Firmas validadas',      color: '#0F6E56' },
  { key: 'OBSERVADO',          label: 'Firmas observadas',     color: '#D85A30' },
  { key: 'VENCIDO',            label: 'Contratos vencidos',    color: '#A32D2D' },
]
const COL_FECHA = {
  PENDIENTE:          'FECHA DE ENVÍO',
  INGRESADO:          'FECHA DE ENVÍO',
  CONTRATO_OBSERVADO: 'FECHA DE OBSERVACION',
  VALIDADO:           'FECHA DE VALIDACION',
  OBSERVADO:          'FECHA DE OBSERVACION',
  VENCIDO:            'FECHA DE VENCIMIENTO',
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
export default function Dashboard() {
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState(null)
  const [meta, setMeta]           = useState(null)
  const [contratos, setContratos] = useState([])
  const [ultimaAct, setUltimaAct] = useState(null)
  const [categoriaActiva, setCategoriaActiva]           = useState('PENDIENTE')
  const [lapsoActivo, setLapsoActivo]                   = useState(getLapsoDefault)
  const [lapsoModificado, setLapsoModificado]           = useState(false)
  const [fechaDesde, setFechaDesde]                     = useState(getFechaDefault)
  const [fechaHasta, setFechaHasta]                     = useState(getFechaDefault)
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false)
  const [regionActiva, setRegionActiva]                 = useState(null)
  const [ciudadActiva, setCiudadActiva]                 = useState(null)
  const [busqueda, setBusqueda]                         = useState('')
  const [errorSolicitud, setErrorSolicitud]             = useState(null)
  const [acAutenticado, setAcAutenticado]               = useState(false)
  const [pinInput, setPinInput]                         = useState('')
  const [mostrarPin, setMostrarPin]                     = useState(false)
  const [pinError, setPinError]                         = useState(false)
  const SHEET_URL = 'https://script.google.com/macros/s/AKfycbw_o2srYTBZg1pDQ4zeoabJT6a4jQnP06DF8soAb27bhx5fAse7pYj9f_4Yp-pOmYGLQw/exec'
  const cargarDatos = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch(SHEET_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const filas = await res.json()
      if (filas.error) throw new Error(filas.error)
      const { meta: metaParsed, contratos: contratosParsed } = parsearSheet(filas)
      const contratosConEstado = contratosParsed.map(c => ({
        ...c,
        _estado: derivarEstado(c),
        _region: c['REGION'] || getRegionDeCiudad(c['CIUDAD']),
        _depto:  c['DEPARTAMENTO'] || getDeptoDeciudad(c['CIUDAD']),
      }))
      setMeta(metaParsed)
      setContratos(contratosConEstado)
      setUltimaAct(new Date())
      setCargando(false)
    } catch (err) {
      setError('Error al cargar: ' + err.message)
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
  const aplicarLapso = useCallback((lapso) => {
    const hoy  = new Date(); hoy.setHours(0,0,0,0)
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate()-1)
    if (lapso === 'hoy')           { setFechaDesde(fmtDate(hoy));  setFechaHasta(fmtDate(hoy)) }
    if (lapso === 'ayer')          { setFechaDesde(fmtDate(ayer)); setFechaHasta(fmtDate(ayer)) }
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
      acc[cat.key] = contratos.filter(c =>
        (c._estado === 'PENDIENTE' || c._estado === 'SOLICITADO') && matchLugar(c)
      ).length
    } else if (cat.key === 'VENCIDO') {
      if (lapsoActivo === 'hoy') {
        acc[cat.key] = contratos.filter(c => {
          const fv    = normalizarFecha(c['FECHA DE VENCIMIENTO'])
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
        c._estado === cat.key &&
        matchFecha(c, COL_FECHA[cat.key] || 'FECHA DE ENVÍO') &&
        matchLugar(c)
      ).length
    }
    return acc
  }, {})
  const contratosFiltrados = contratos.filter(c => {
    if (categoriaActiva === 'PENDIENTE') {
      if (c._estado !== 'PENDIENTE' && c._estado !== 'SOLICITADO') return false
      if (ciudadActiva && (c['CIUDAD'] || '').toUpperCase() !== ciudadActiva.toUpperCase()) return false
      if (regionActiva && c._region !== regionActiva) return false
      if (busqueda.trim()) {
        const q      = busqueda.trim().toLowerCase()
        const nombre = (c['CLIENTE'] || '').toLowerCase()
        const doi    = String(c['DOI'] || '').toLowerCase()
        if (!nombre.includes(q) && !doi.includes(q)) return false
      }
      return true
    } else if (categoriaActiva === 'INGRESADO') {
      if (!esEmitido(c)) return false
    } else if (categoriaActiva === 'VENCIDO') {
      const fv    = normalizarFecha(c['FECHA DE VENCIMIENTO'])
      const firma = String(c['CONTRATO FIRMADO CONFORME'] || '').trim().toUpperCase()
      if (lapsoActivo === 'hoy') {
        if (fv !== fechaHoyStr()) return false
        if (firma === 'SI' || firma === 'VENCIDO') return false
      } else {
        if (c._estado !== 'VENCIDO') return false
        if ((fechaDesde || fechaHasta) && !matchFecha(c, 'FECHA DE VENCIMIENTO')) return false
      }
    } else {
      if (c._estado !== categoriaActiva) return false
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
      const q      = busqueda.trim().toLowerCase()
      const nombre = (c['CLIENTE'] || '').toLowerCase()
      const doi    = String(c['DOI'] || '').toLowerCase()
      if (!nombre.includes(q) && !doi.includes(q)) return false
    }
    return true
  })
  const horaAct = ultimaAct
    ? ultimaAct.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : null
  const totalValidados  = contratos.filter(c => c._estado === 'VALIDADO').length
  const ciudadesRegion  = regionActiva ? ciudadesDeRegion(regionActiva) : []
  const categoriaLabel  = CATEGORIAS.find(c => c.key === categoriaActiva)?.label || ''
  const plazoLabel = lapsoActivo === 'hoy'  ? 'HOY'
                   : lapsoActivo === 'ayer' ? 'AYER'
                   : (fechaDesde && fechaHasta)
                       ? `${fechaDesde.split('-').reverse().join('/')} – ${fechaHasta.split('-').reverse().join('/')}`
                   : fechaDesde
                       ? `DESDE ${fechaDesde.split('-').reverse().join('/')}`
                       : ''
  const plazoEfectivo = categoriaActiva === 'PENDIENTE' ? 'TOTAL' : plazoLabel
  const regionLabel   = ciudadActiva || regionActiva || 'TODAS'
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F1EFE8' }}>
      <header style={{ backgroundColor: '#1A2238' }} className="px-4 pt-6 pb-5">
        <div className="max-w-lg mx-auto">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: '500', color: 'white' }}>GoTrack</h1>
              <p style={{ fontSize: '12px', color: '#9BB4D8' }}>
                {`Seguimiento de contratos${horaAct ? ' · ' + horaAct : ''}`}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => { setMostrarPin(v => !v); setPinError(false); setPinInput('') }}
                title={acAutenticado ? 'AC autenticado' : 'Acceso AC'}
                style={{ color: acAutenticado ? '#4A90D9' : '#9BB4D8', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {acAutenticado
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0v4M5 11h14l1 10H4L5 11z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  }
                </svg>
              </button>
              <button onClick={cargarDatos} style={{ color: '#9BB4D8', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <a
              href="https://gobot-leg.github.io/GOBOT/gobot_faq_68.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: '500', color: '#9BB4D8',
                textDecoration: 'none', padding: '4px 8px',
                borderRadius: '6px', border: '0.5px solid #2D3A5A',
              }}
            >
              <svg style={{ width: '13px', height: '13px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {'GoBot · Resuelve tus dudas'}
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
        </div>
      </header>
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
                    cursor: 'pointer',
                    transition: 'border 0.15s',
                  }}
                >
                  <div style={{ fontSize: '24px', fontWeight: '500', color: '#1A2238', lineHeight: '1' }}>
                    {counts[cat.key] || 0}
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: '500', color: cat.color, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: '1.3' }}>
                    {cat.label}
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
                    { key: null,                 label: 'Todas' },
                    { key: 'LIMA METROPOLITANA', label: 'Lima Met.' },
                    { key: 'NORTE',              label: 'Norte' },
                    { key: 'SUR',                label: 'Sur' },
                    { key: 'ORIENTE',            label: 'Oriente' },
                    { key: 'CENTRO',             label: 'Centro' },
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
            />

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

              {/* Bancos de Datos Personales */}
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

              {/* Confidencialidad */}
              <div style={{ borderTop: '0.5px solid #E8E6DF', paddingTop: '12px', marginBottom: '14px', textAlign: 'left' }}>
                <p style={{ fontSize: '9px', color: '#B4B2A9', lineHeight: '1.6' }}>
                  {'La información contenida en esta plataforma es de carácter confidencial y de uso exclusivo del personal autorizado de Global Go S.A.C. y de la Cooperativa de Ahorro y Crédito Promotora de Negocios y Servicios. Su acceso, reproducción o divulgación no autorizada está prohibida.'}
                </p>
              </div>

              {/* Copyright y créditos */}
              <div style={{ borderTop: '0.5px solid #E8E6DF', paddingTop: '12px' }}>
                <p style={{ fontSize: '9px', color: '#B4B2A9', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  {`© ${new Date().getFullYear()} Global Go S.A.C. · Todos los derechos reservados`}
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

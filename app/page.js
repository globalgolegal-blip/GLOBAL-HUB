'use client'
import { useState, useEffect, useCallback } from 'react'
import MetaCard from '../components/MetaCard'
import ContractList from '../components/ContractList'
import { parsearSheet } from '../lib/parseSheets'
import { derivarEstado, hoyISO, ESTADO_CONFIG } from '../lib/utils'
import { getRegionDeCiudad, getDeptoDeciudad, ciudadesDeRegion } from '../lib/regions'

const CATEGORIAS = [
  { key: 'PENDIENTE',          label: 'Contratos por firmar',  color: '#185FA5' },
  { key: 'INGRESADO',          label: 'Contratos emitidos',    color: '#534AB7' },
  { key: 'CONTRATO_OBSERVADO', label: 'Contratos observados',  color: '#BA7517' },
  { key: 'VALIDADO',           label: 'Firmas validadas',      color: '#0F6E56' },
  { key: 'OBSERVADO',          label: 'Firmas observadas',     color: '#D85A30' },
  { key: 'VENCIDO',            label: 'Contratos vencidos',    color: '#A32D2D' },
]

// Columna de fecha que aplica según la categoría seleccionada
const COL_FECHA = {
  PENDIENTE:          'FECHA DE ENVÍO',
  INGRESADO:          'FECHA DE ENVÍO',
  CONTRATO_OBSERVADO: 'FECHA DE ENVÍO',
  VALIDADO:           'FECHA DE VALIDACION',
  OBSERVADO:          'FECHA DE OBSERVACION',
  VENCIDO:            'FECHA DE VENCIMIENTO',
}

function fechaHoyStr() {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`
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

  // Filtros — valores por defecto según especificación
  const [categoriaActiva, setCategoriaActiva]         = useState('PENDIENTE')
  const [lapsoActivo, setLapsoActivo]                 = useState('hoy')
  const [fechaDesde, setFechaDesde]                   = useState(fechaHoyStr)
  const [fechaHasta, setFechaHasta]                   = useState(fechaHoyStr)
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false)
  const [regionActiva, setRegionActiva]               = useState(null)
  const [ciudadActiva, setCiudadActiva]               = useState(null)
  const [busqueda, setBusqueda]                       = useState('')

  const aplicarLapso = useCallback((lapso) => {
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    if (lapso === 'hoy')    { setFechaDesde(fmt(hoy)); setFechaHasta(fmt(hoy)) }
    if (lapso === 'semana') { const a=new Date(hoy); a.setDate(a.getDate()-6); setFechaDesde(fmt(a)); setFechaHasta(fmt(hoy)) }
    if (lapso === 'personalizado') { setFechaDesde(''); setFechaHasta('') }
    setLapsoActivo(lapso)
    setMostrarPersonalizado(lapso === 'personalizado')
  }, [])

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

  // Conteos por categoría (totales sin filtro de fecha ni región)
  const counts = CATEGORIAS.reduce((acc, cat) => {
    if (cat.key === 'INGRESADO') {
      // "Contratos emitidos" = todos los que tienen ENVIADO='SI', sin importar si ya firmaron
      acc[cat.key] = contratos.filter(c =>
        (c['CONTRATO ENVIADO'] || '').trim().toUpperCase() === 'SI'
      ).length
    } else {
      acc[cat.key] = contratos.filter(c => c._estado === cat.key).length
    }
    return acc
  }, {})

  // Contratos filtrados para la lista
  const contratosFiltrados = contratos.filter(c => {
    if (categoriaActiva === 'INGRESADO') {
      // Mostrar todos con ENVIADO='SI' independientemente del estado de firma
      if ((c['CONTRATO ENVIADO'] || '').trim().toUpperCase() !== 'SI') return false
    } else {
      if (c._estado !== categoriaActiva) return false
    }

    if (fechaDesde || fechaHasta) {
      const colFecha = COL_FECHA[categoriaActiva] || 'FECHA DE ENVÍO'
      const fechaISO = normalizarFecha(c[colFecha])
      if (!fechaISO) return false
      if (fechaDesde && fechaISO < fechaDesde) return false
      if (fechaHasta && fechaISO > fechaHasta) return false
    }

    if (ciudadActiva) {
      if ((c['CIUDAD'] || '').toUpperCase() !== ciudadActiva.toUpperCase()) return false
    } else if (regionActiva) {
      if (c._region !== regionActiva) return false
    }

    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      const nombre = (c['CLIENTE'] || '').toLowerCase()
      const doi    = String(c['DOI'] || '').toLowerCase()
      if (!nombre.includes(q) && !doi.includes(q)) return false
    }

    return true
  })

  const horaAct = ultimaAct
    ? ultimaAct.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : null

  const totalValidados = contratos.filter(c => c._estado === 'VALIDADO').length
  const ciudadesRegion  = regionActiva ? ciudadesDeRegion(regionActiva) : []

  const categoriaLabel = CATEGORIAS.find(c => c.key === categoriaActiva)?.label || ''
  const plazoLabel = lapsoActivo === 'hoy'    ? 'HOY'
                   : lapsoActivo === 'semana' ? 'ÚLTIMA SEMANA'
                   : (fechaDesde && fechaHasta) ? `${fechaDesde.split('-').reverse().join('/')} – ${fechaHasta.split('-').reverse().join('/')}`
                   : fechaDesde ? `DESDE ${fechaDesde.split('-').reverse().join('/')}` : ''
  const regionLabel = ciudadActiva || regionActiva || 'TODAS'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F1EFE8' }}>

      {/* Header */}
      <header style={{ backgroundColor: '#1A2238' }} className="px-4 pt-6 pb-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '500', color: 'white' }}>GoTrack</h1>
            <p style={{ fontSize: '12px', color: '#9BB4D8' }}>
              Seguimiento de contratos{horaAct ? ` · ${horaAct}` : ''}
            </p>
          </div>
          <button onClick={cargarDatos} style={{ color: '#9BB4D8', padding: '4px' }}>
            <svg style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
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

        {!cargando && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Meta mensual — oculto */}
            {/* {meta && <MetaCard meta={meta} totalValidados={totalValidados} />} */}

            {/* Tarjetas de categorías — 2 columnas */}
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
                    border: categoriaActiva === cat.key
                      ? '2px solid #1A2238'
                      : '0.5px solid #D3D1C7',
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

            {/* Filtros */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '12px 14px', border: '0.5px solid #D3D1C7' }}>

              {/* Buscador */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#888780' }}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o DOI…"
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
                    ✕
                  </button>
                )}
              </div>

              {/* Plazo */}
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', fontWeight: '500', color: '#5F5E5A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Plazo
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { id: 'hoy',           label: 'Hoy' },
                    { id: 'semana',        label: 'Última semana' },
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
                    <span style={{ color: '#888780', fontSize: '12px' }}>–</span>
                    <input type="date" value={fechaHasta} min={fechaDesde} max={hoyISO()}
                      onChange={e => setFechaHasta(e.target.value)}
                      style={{ flex: 1, fontSize: '11px', border: '0.5px solid #D3D1C7', borderRadius: '8px', padding: '6px 8px', outline: 'none' }} />
                  </div>
                )}
              </div>

              {/* Región / Ciudad */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: '500', color: '#5F5E5A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Región / Ciudad
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { key: null,                  label: 'Todas' },
                    { key: 'LIMA METROPOLITANA',  label: 'Lima Met.' },
                    { key: 'NORTE',               label: 'Norte' },
                    { key: 'SUR',                 label: 'Sur' },
                    { key: 'ORIENTE',             label: 'Oriente' },
                    { key: 'CENTRO',              label: 'Centro' },
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

                {/* Panel de ciudades */}
                {regionActiva && ciudadesRegion.length > 0 && (
                  <div style={{ marginTop: '8px', background: '#F1EFE8', borderLeft: '3px solid #1A2238', borderRadius: '8px', padding: '8px 10px' }}>
                    <p style={{ fontSize: '10px', color: '#5F5E5A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                      Ciudades · {regionActiva}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {ciudadesRegion.map(ciudad => (
                        <button key={ciudad}
                          onClick={() => setCiudadActiva(ciudadActiva === ciudad ? null : ciudad)}
                          style={{
                            fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                            background: ciudadActiva === ciudad ? '#1A2238' : 'white',
                            color: ciudadActiva === ciudad ? 'white' : '#444441',
                            border: ciudadActiva === ciudad ? '0.5px solid #1A2238' : '0.5px solid #B4B2A9',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}>
                          {ciudad}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de contratos */}
            <ContractList
              contratos={contratosFiltrados}
              categoriaLabel={categoriaLabel}
              plazoLabel={plazoLabel}
              regionLabel={regionLabel}
            />

          </div>
        )}
      </main>
    </div>
  )
}

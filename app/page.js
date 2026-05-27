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

const COL_FECHA = {
  PENDIENTE:          'FECHA DE ENVÍO',
  INGRESADO:          'FECHA DE ENVÍO',
  CONTRATO_OBSERVADO: 'FECHA DE ENVÍO',
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

// Antes de las 12pm: "ayer" (reporte matutino). Desde las 12pm: "hoy"
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
  const [lapsoModificado, setLapsoModificado]           = useState(false)   // true cuando el usuario elige un plazo manualmente
  const [fechaDesde, setFechaDesde]                     = useState(getFechaDefault)
  const [fechaHasta, setFechaHasta]                     = useState(getFechaDefault)
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false)
  const [regionActiva, setRegionActiva]                 = useState(null)
  const [ciudadActiva, setCiudadActiva]                 = useState(null)
  const [busqueda, setBusqueda]                         = useState('')

  const aplicarLapso = useCallback((lapso) => {
    const hoy  = new Date(); hoy.setHours(0,0,0,0)
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate()-1)
    if (lapso === 'hoy')           { setFechaDesde(fmtDate(hoy));  setFechaHasta(fmtDate(hoy)) }
    if (lapso === 'ayer')          { setFechaDesde(fmtDate(ayer)); setFechaHasta(fmtDate(ayer)) }
    if (lapso === 'personalizado') { setFechaDesde(''); setFechaHasta('') }
    setLapsoActivo(lapso)
    setLapsoModificado(true)   // el usuario eligió explícitamente un plazo
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

  // Un contrato está "emitido" si tiene FECHA DE ENVÍO con valor (independiente del estado de firma)
  function esEmitido(c) {
    return !!normalizarFecha(getFechaEnvio(c)) && c._estado !== 'CONTRATO_OBSERVADO'
  }

  // Verifica si un contrato cae en el rango de fechas activo
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

  // Verifica si un contrato pertenece a la región/ciudad activa
  function matchLugar(c) {
    if (ciudadActiva) return (c['CIUDAD'] || '').toUpperCase() === ciudadActiva.toUpperCase()
    if (regionActiva) return c._region === regionActiva
    return true
  }

  // Conteos por categoría:
  //   PENDIENTE  → al cargar: total (sin filtro de fecha). Al elegir plazo: filtra por fecha de envío.
  //   INGRESADO  → siempre filtra por plazo activo (ayer antes de 12pm, hoy después).
  //   El resto   → filtra por su columna de fecha correspondiente.
  const counts = CATEGORIAS.reduce((acc, cat) => {
    if (cat.key === 'INGRESADO') {
      acc[cat.key] = contratos.filter(c =>
        esEmitido(c) && matchFecha(c, 'FECHA DE ENVÍO') && matchLugar(c)
      ).length
    } else if (cat.key === 'PENDIENTE') {
      acc[cat.key] = contratos.filter(c =>
        c._estado === 'PENDIENTE' &&
        (lapsoModificado ? matchFecha(c, COL_FECHA['PENDIENTE']) : true) &&
        matchLugar(c)
      ).length
    } else {
      acc[cat.key] = contratos.filter(c =>
        c._estado === cat.key &&
        matchFecha(c, COL_FECHA[cat.key] || 'FECHA DE ENVÍO') &&
        matchLugar(c)
      ).length
    }
    return acc
  }, {})

  // Lista de contratos filtrada
  const contratosFiltrados = contratos.filter(c => {
    // 1. Filtro por categoría
    if (categoriaActiva === 'INGRESADO') {
      if (!esEmitido(c)) return false
    } else {
      if (c._estado !== categoriaActiva) return false
    }

    // 2. Filtro por fecha
    //    PENDIENTE: solo aplica si el usuario eligió un plazo manualmente
    const aplicarPlazo = categoriaActiva === 'PENDIENTE' ? lapsoModificado : true
    if (aplicarPlazo && (fechaDesde || fechaHasta)) {
      const colFecha = categoriaActiva === 'INGRESADO'
        ? 'FECHA DE ENVÍO'
        : (COL_FECHA[categoriaActiva] || 'FECHA DE ENVÍO')
      if (!matchFecha(c, colFecha)) return false
    }

    // 3. Filtro por región/ciudad
    if (ciudadActiva) {
      if ((c['CIUDAD'] || '').toUpperCase() !== ciudadActiva.toUpperCase()) return false
    } else if (regionActiva) {
      if (c._region !== regionActiva) return false
    }

    // 4. Búsqueda
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

  // Para PENDIENTE sin filtro activo, mostramos "TOTAL"
  const plazoEfectivo = (categoriaActiva === 'PENDIENTE' && !lapsoModificado) ? 'TOTAL' : plazoLabel
  const regionLabel   = ciudadActiva || regionActiva || 'TODAS'

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
                    { id: 'ayer',          label: 'Ayer' },
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

                {/* Ciudades de la región seleccionada */}
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

            {/* Barra de contexto: categoría activa · plazo · región */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 2px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#1A2238' }}>
                {categoriaLabel}
                <span style={{ fontWeight: '400', color: '#888780' }}> · {plazoEfectivo}</span>
                {regionLabel !== 'TODAS' && (
                  <span style={{ fontWeight: '400', color: '#888780' }}> · {regionLabel}</span>
                )}
              </span>
              <span style={{ fontSize: '12px', color: '#888780' }}>
                {contratosFiltrados.length} contrato{contratosFiltrados.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Lista de contratos */}
            <ContractList contratos={contratosFiltrados} categoriaActiva={categoriaActiva} />

          </div>
        )}
      </main>
    </div>
  )
}

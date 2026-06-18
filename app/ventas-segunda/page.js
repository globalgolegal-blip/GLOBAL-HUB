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
const SLOTS_MANANA = []   // Lun–Vie mañana
const SLOTS_TARDE  = []   // Lun–Vie tarde
const SLOTS_SAB    = []   // Sábado
const _slot = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
for (let m = 555; m <= 750; m += 15) SLOTS_MANANA.push(_slot(m))
for (let m = 855; m <= 990; m += 15) SLOTS_TARDE.push(_slot(m))
for (let m = 555; m <= 705; m += 15) SLOTS_SAB.push(_slot(m))

function formatFechaLocal(d) {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function labelDia(fecha) {
  const hoy    = formatFechaLocal(new Date())
  const manana = formatFechaLocal(new Date(Date.now() + 86400000))
  const ayer   = formatFechaLocal(new Date(Date.now() - 86400000))
  // Parsear sin conversión UTC (usar mediodía local para evitar off-by-one)
  const d      = new Date(fecha + 'T12:00:00')
  const semana = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
  const meses  = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const base   = `${semana[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`
  if (fecha === hoy)    return `Hoy — ${base}`
  if (fecha === manana) return `Mañana — ${base}`
  if (fecha === ayer)   return `Ayer — ${base}`
  return base
}

export default function VentasSegundaPage() {
  const [usuario, setUsuario]           = useState(null)
  const [mostrarLogin, setLogin]        = useState(false)
  const [pinInput, setPinInput]         = useState('')
  const [pinError, setPinError]         = useState('')
  const [ventas, setVentas]             = useState([])
  const [cargando, setCargando]         = useState(false)
  const [actualizando, setActualizando] = useState(false)
  const [errorData, setErrorData]       = useState(null)
  const [ultimaAct, setUltimaAct]       = useState(null)
  const [busqueda, setBusqueda]           = useState('')
  const [filtroEstado, setFiltroEstado]   = useState(null)
  const [vista, setVista]                 = useState('lista')   // 'lista' | 'agenda'
  const [fechaAgenda, setFechaAgenda]   = useState(formatFechaLocal(new Date()))

  const cargarVentas = useCallback(async (esInicial = false) => {
    if (!VS_SCRIPT_URL) { setErrorData('Variable NEXT_PUBLIC_VS_SCRIPT_URL no configurada.'); return }
    if (esInicial) setCargando(true)
    else setActualizando(true)
    setErrorData(null)
    try {
      const res  = await fetch(VS_SCRIPT_URL, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
      const data = await res.json()
      if (data && data.ok === false) throw new Error(data.error || 'Error en el servidor')
      const filas = Array.isArray(data) ? data : (data.filas || [])
      setVentas(parsearVentas(filas))
      setUltimaAct(new Date())
    } catch (e) {
      setErrorData(e.message)
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }, [])

  useEffect(() => { cargarVentas(true) }, [cargarVentas])

  // Auto-refresh cada 90 segundos sin perder sesión de PIN
  useEffect(() => {
    const id = setInterval(() => cargarVentas(false), 90_000)
    return () => clearInterval(id)
  }, [cargarVentas])

  const verificarPin = () => {
    const usr = autenticarVS(pinInput)
    if (usr) {
      setUsuario(usr)
      setPinError('')
      setPinInput('')
      setLogin(false)
    } else {
      setPinError('PIN incorrecto.')
      setPinInput('')
    }
  }

  const cerrarSesion = () => {
    setUsuario(null)
    setLogin(false)
  }

  const estados = ventas.map(v => derivarEstadoVS(v))
  const count = (e) => estados.filter(x => x === e).length

  const toggleFiltro = (estado) => setFiltroEstado(prev => prev === estado ? null : estado)

  // Cuando hay rol activo → marca cada venta con _pendiente; sin rol → todas las ventas
  const ventasBase = usuario?.rol
    ? ventas.map(v => ({ ...v, _pendiente: tienePendienteParaRol(v, usuario.rol) }))
    : ventas

  // Filtro de estado del pipeline (encima de la base)
  const ventasFiltradas = filtroEstado
    ? ventasBase.filter(v => derivarEstadoVS(v) === filtroEstado)
    : ventasBase

  const stats = {
    ingresados:     count('INGRESADO'),
    confirmados:    count('CONFIRMADO'),
    agendados:      count('EN_CITA'),
    citaConfirmada: count('CITA_CONFIRMADA'),
    docsObservados: count('DOCS_OBSERVADOS'),
    docsSubsanados: count('DOCS_SUBSANADOS'),
    reagendar:      count('PENDIENTE_REAGENDA'),
    gmSolicitada:   count('GM_SOLICITADA'),
    gmLevantada:    count('GM_LEVANTADA'),
    firmados:       count('FIRMADO'),
  }

  const moverDia = (delta) => {
    const d = new Date(fechaAgenda + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setFechaAgenda(formatFechaLocal(d))
  }

  return (
    <div style={{ background: '#F1EFE8', minHeight: '100vh' }}>

      {/* HEADER */}
      <header style={{ backgroundColor: NAVY, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 512, margin: '0 auto', padding: '10px 16px 0' }}>

          {/* Fila principal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }}>
            <h1 style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: 0 }}>GoTrack</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {usuario ? (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{usuario.nombre}</span>
                  <button onClick={() => cargarVentas(false)} disabled={cargando || actualizando} title="Actualizar"
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 16, cursor: 'pointer' }}>
                    🔄
                  </button>
                  <button onClick={cerrarSesion}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6,
                      color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer', padding: '3px 8px' }}>
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => cargarVentas(false)} disabled={cargando || actualizando} title="Actualizar"
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 15, cursor: 'pointer' }}>
                    🔄
                  </button>
                  <button onClick={() => setLogin(v => !v)}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6,
                      color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer', padding: '3px 8px' }}>
                    🔐 Identificarse
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tabs Lista / Agenda + botón volver */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['lista', 'agenda'].map(v => (
                <button key={v} onClick={() => setVista(v)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6,
                    border: 'none', cursor: 'pointer',
                    background: vista === v ? 'white' : 'rgba(255,255,255,0.15)',
                    color:      vista === v ? NAVY   : 'rgba(255,255,255,0.7)',
                  }}>
                  {v === 'lista' ? 'Lista' : 'Agenda'}
                </button>
              ))}
            </div>
            <a href="/"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500,
                color: '#9BB4D8', textDecoration: 'none', padding: '4px 8px',
                borderRadius: 6, border: '0.5px solid #2D3A5A' }}>
              {'← Desembolso'}
            </a>
          </div>

          {/* Panel de login inline (desplegable) */}
          {mostrarLogin && !usuario && (
            <div style={{ background: '#243150', borderRadius: 8, padding: '12px 14px',
              marginBottom: 10, border: '1px solid #2D3A5A' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 8px' }}>
                Ingresa tu PIN de área
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  value={pinInput}
                  onChange={e => { setPinInput(e.target.value); setPinError('') }}
                  onKeyDown={e => e.key === 'Enter' && verificarPin()}
                  placeholder="PIN"
                  autoComplete="off"
                  style={{ flex: 1, border: pinError ? '1.5px solid #EF4444' : '1.5px solid #3D4F72',
                    borderRadius: 6, padding: '8px 12px', fontSize: 14,
                    background: '#1A2238', color: 'white', outline: 'none', letterSpacing: 4 }}
                />
                <button onClick={verificarPin} disabled={!pinInput.trim()}
                  style={{ background: pinInput.trim() ? '#3B82F6' : '#374151', color: 'white',
                    border: 'none', borderRadius: 6, padding: '8px 16px',
                    fontSize: 13, fontWeight: 600, cursor: pinInput.trim() ? 'pointer' : 'not-allowed' }}>
                  Entrar
                </button>
              </div>
              {pinError && (
                <p style={{ color: '#FCA5A5', fontSize: 11, margin: '6px 0 0' }}>{pinError}</p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* CONTENIDO — condicional por vista */}
      {vista === 'lista' ? (

        <main style={{ maxWidth: 512, margin: '0 auto', padding: '16px 12px 40px' }}>

          {/* Indicador de filtro activo */}
          {filtroEstado && (
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, textAlign: 'right' }}>
              Filtrando por estado —{' '}
              <button onClick={() => setFiltroEstado(null)}
                style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, padding: 0 }}>
                Ver todos
              </button>
            </div>
          )}

          {/* Metric cards — Alertas + Pipeline */}

          {/* Fila 1: Alert cards para estados que necesitan atención */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <AlertCard
              label="DOCS OBSERVADOS" count={stats.docsObservados}
              color="#DC2626" borderColor="#FCA5A5"
              estado="DOCS_OBSERVADOS" activo={filtroEstado} onToggle={toggleFiltro}
            />
            <AlertCard
              label="SUBSANADOS" count={stats.docsSubsanados}
              color="#065F46" borderColor="#6EE7B7"
              estado="DOCS_SUBSANADOS" activo={filtroEstado} onToggle={toggleFiltro}
            />
            <AlertCard
              label="REAGENDAS" count={stats.reagendar}
              color="#B45309" borderColor="#FCD34D"
              estado="PENDIENTE_REAGENDA" activo={filtroEstado} onToggle={toggleFiltro}
            />
          </div>

          {/* Fila 2: Pipeline strip — flujo normal */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #D9D4C8',
            padding: '10px 8px', marginBottom: 12, overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content' }}>
              <PipelineStep label="Ingresados"    count={stats.ingresados}     estado="INGRESADO"          activo={filtroEstado} onToggle={toggleFiltro} />
              <PipelineArr />
              <PipelineStep label="Confirmados"   count={stats.confirmados}    estado="CONFIRMADO"         activo={filtroEstado} onToggle={toggleFiltro} />
              <PipelineArr />
              <PipelineStep label="Cita agendada" count={stats.agendados}      estado="EN_CITA"            activo={filtroEstado} onToggle={toggleFiltro} />
              <PipelineArr />
              <PipelineStep label="Cita OK"       count={stats.citaConfirmada} estado="CITA_CONFIRMADA"    activo={filtroEstado} onToggle={toggleFiltro} />
              <PipelineArr />
              <PipelineStep label="GM Solic."     count={stats.gmSolicitada}   estado="GM_SOLICITADA"      activo={filtroEstado} onToggle={toggleFiltro} />
              <PipelineArr />
              <PipelineStep label="GM Levant."    count={stats.gmLevantada}    estado="GM_LEVANTADA"       activo={filtroEstado} onToggle={toggleFiltro} />
              <PipelineArr />
              <PipelineStep label="Firmados"      count={stats.firmados}       estado="FIRMADO"            activo={filtroEstado} onToggle={toggleFiltro} />
            </div>
          </div>

          {/* Indicador de actualización silenciosa */}
          {actualizando && (
            <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginBottom: 4 }}>
              Actualizando...
            </div>
          )}

          {/* Buscador */}
          <div style={{ marginBottom: 12, position: 'relative' }}>
            <input type="search" value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por placa, nombre o DNI..."
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #D1D5DB',
                borderRadius: 8, padding: '9px 14px 9px 36px', fontSize: 13,
                background: 'white', outline: 'none' }} />
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              color: '#9CA3AF', pointerEvents: 'none' }}>🔍</span>
          </div>

          {cargando && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#6B7280', fontSize: 13 }}>
              Cargando ventas...
            </div>
          )}
          {errorData && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
              padding: 12, marginBottom: 12, color: '#991B1B', fontSize: 13 }}>
              {errorData}
              <button onClick={cargarVentas}
                style={{ marginLeft: 8, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                Reintentar
              </button>
            </div>
          )}

          {!cargando && !errorData && (
            <VentaList
              ventas={ventasFiltradas}
              busqueda={busqueda}
              rol={usuario?.rol ?? null}
              onActualizar={cargarVentas}
            />
          )}

          {ultimaAct && !cargando && (
            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 12 }}>
              Actualizado: {ultimaAct.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </main>

      ) : (

        <AgendaView
          ventas={ventas}
          fecha={fechaAgenda}
          onMoverDia={moverDia}
          cargando={cargando}
        />

      )}
      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '20px 16px 32px' }}>
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
          Desarrollado por{' '}
          <span style={{ fontWeight: 600, color: '#6B7280' }}>Fernando Barzola</span>
          {' '}y{' '}
          <span style={{ fontWeight: 600, color: '#6B7280' }}>Juan Carlos Barrientos</span>
        </p>
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// AlertCard — card grande para estados que requieren atención
// ─────────────────────────────────────────────────────────────────
function AlertCard({ label, count, color, borderColor, estado, activo, onToggle }) {
  const isActive = activo === estado
  return (
    <div onClick={() => onToggle(estado)} style={{
      flex: 1,
      background:   isActive ? color + '12' : 'white',
      border:       `1.5px solid ${isActive ? color : borderColor}`,
      borderRadius: 12,
      padding:      '12px 14px',
      cursor:       'pointer',
      transition:   'border 0.12s, background 0.12s',
    }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: '#1A2238', lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase',
        letterSpacing: '0.06em', marginTop: 5 }}>
        ● {label}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// PipelineStep + PipelineArr — pipeline strip
// ─────────────────────────────────────────────────────────────────
function PipelineStep({ label, count, estado, activo, onToggle }) {
  const isActive = activo === estado
  return (
    <div onClick={() => onToggle(estado)} style={{
      textAlign:    'center',
      padding:      '4px 10px',
      borderRadius: 8,
      cursor:       'pointer',
      background:   isActive ? '#EFF6FF' : 'transparent',
      transition:   'background 0.12s',
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1A2238' }}>{count}</div>
      <div style={{ fontSize: 8, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase',
        letterSpacing: '0.04em', marginTop: 2, whiteSpace: 'nowrap' }}>
        {label}
      </div>
    </div>
  )
}
function PipelineArr() {
  return <span style={{ color: '#D9D4C8', fontSize: 16, padding: '0 1px', userSelect: 'none' }}>›</span>
}

// ─────────────────────────────────────────────────────────────────
// AgendaView — vista diaria de citas
// ─────────────────────────────────────────────────────────────────
function AgendaView({ ventas, fecha, onMoverDia, cargando }) {
  // Ventas del día seleccionado que tienen cita registrada
  const ventasDia = ventas.filter(v => v.FECHA_CITA === fecha)

  // Derivar estado para cada venta del día
  const entradas = ventasDia.map(v => ({ venta: v, estado: derivarEstadoVS(v) }))

  // Mapa hora → entrada (primera coincidencia por slot)
  const mapaHora = {}
  entradas.forEach(e => {
    if (e.venta.HORA_CITA) {
      const h = String(e.venta.HORA_CITA).trim().substring(0, 5)
      if (!mapaHora[h]) mapaHora[h] = e  // primera en caso de colisión
    }
  })

  const agendadas = entradas.filter(e => e.estado === 'EN_CITA').length
  const citaOk    = entradas.filter(e => e.estado === 'CITA_CONFIRMADA').length
  const reagendar = entradas.filter(e => e.estado === 'PENDIENTE_REAGENDA').length
  const total     = entradas.length

  return (
    <div style={{ maxWidth: 512, margin: '0 auto' }}>

      {/* Navegador de día */}
      <div style={{
        background: NAVY, borderTop: '0.5px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
      }}>
        <button onClick={() => onMoverDia(-1)}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
            borderRadius: 6, padding: '6px 14px', fontSize: 18, cursor: 'pointer', fontWeight: 600 }}>
          ‹
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>{labelDia(fecha)}</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
            {total === 0
              ? 'Sin citas programadas'
              : `${total} cita${total > 1 ? 's' : ''} programada${total > 1 ? 's' : ''}`}
          </div>
        </div>
        <button onClick={() => onMoverDia(1)}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
            borderRadius: 6, padding: '6px 14px', fontSize: 18, cursor: 'pointer', fontWeight: 600 }}>
          ›
        </button>
      </div>

      {/* Resumen del día */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
        padding: '12px 14px', background: '#F1EFE8',
      }}>
        <StatDia valor={agendadas} label="Agendadas"  color="#065F46" />
        <StatDia valor={citaOk}    label="Cita OK"    color="#3730A3" />
        <StatDia valor={reagendar} label="Reagendar"  color="#B45309" />
      </div>

      {/* Timeline */}
      <div style={{ background: '#F1EFE8', padding: '0 14px 40px' }}>
        {cargando ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF', fontSize: 13 }}>
            Cargando...
          </div>
        ) : (() => {
          const esSabado = new Date(fecha + 'T12:00:00').getDay() === 6
          return (
            <>
              <BloqueTurno
                label={esSabado ? 'Sábado — 09:15 a 11:45' : 'Turno mañana — 09:15 a 12:30'}
                slots={esSabado ? SLOTS_SAB : SLOTS_MANANA}
                mapaHora={mapaHora}
              />
              {!esSabado && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 6px' }}>
                    <div style={{ flex: 1, borderTop: '1px dashed #D1D5DB' }} />
                    <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                      Refrigerio 12:30 – 14:15
                    </span>
                    <div style={{ flex: 1, borderTop: '1px dashed #D1D5DB' }} />
                  </div>
                  <BloqueTurno
                    label="Turno tarde — 14:15 a 16:30"
                    slots={SLOTS_TARDE}
                    mapaHora={mapaHora}
                  />
                </>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}

function StatDia({ valor, label, color }) {
  return (
    <div style={{ background: 'white', borderRadius: 10, border: '0.5px solid #D9D4C8',
      padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 600, color: '#1A2238' }}>{valor}</div>
      <div style={{ fontSize: 9, fontWeight: 600, color, textTransform: 'uppercase',
        letterSpacing: '0.05em', marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

function BloqueTurno({ label, slots, mapaHora }) {
  return (
    <>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase',
        letterSpacing: '0.06em', padding: '12px 0 6px' }}>
        {label}
      </div>
      {slots.map(slot => {
        const entry = mapaHora[slot]
        return (
          <div key={slot} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
            <div style={{
              fontSize: 11, width: 36, flexShrink: 0, paddingTop: 9,
              color:      entry ? '#374151' : '#9CA3AF',
              fontWeight: entry ? 600 : 400,
            }}>
              {slot}
            </div>
            {entry
              ? <SlotOcupado venta={entry.venta} estado={entry.estado} />
              : (
                <div style={{ flex: 1, background: '#F9F9F7', border: '0.5px solid #E5E2DB',
                  borderRadius: 10, padding: '8px 12px' }}>
                  <span style={{ fontSize: 12, color: '#C4C0B8' }}>Libre</span>
                </div>
              )
            }
          </div>
        )
      })}
    </>
  )
}

function SlotOcupado({ venta, estado }) {
  const cfg = ESTADO_CONFIG_VS[estado] || {}
  return (
    <div style={{
      flex: 1, borderRadius: 10,
      background: cfg.bgBadge     || '#F3F4F6',
      border:     `0.5px solid ${cfg.borderBadge || '#D1D5DB'}`,
      padding:    '8px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A2238' }}>
          {venta.PLACA || '—'}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
          background:  cfg.borderBadge || '#D1D5DB',
          color:       cfg.colorText   || '#374151',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {cfg.labelCorto || estado}
        </span>
      </div>
      {venta.NOMBRE && (
        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
          {venta.NOMBRE}
        </div>
      )}
    </div>
  )
}

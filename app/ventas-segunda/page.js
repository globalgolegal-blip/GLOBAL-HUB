'use client'
// app/ventas-segunda/page.js
// Comercial accede SIN PIN — ve cards y puede agendar citas.
// Tesorería / Notaría / Legal se identifican con PIN para acciones elevadas.

import { useState, useEffect, useCallback } from 'react'
import { autenticarVS } from '../../lib/auth'
import { parsearVentas } from '../../lib/ventas-segunda/parseSheets'
import { derivarEstadoVS } from '../../lib/ventas-segunda/utils'
import VentaList from './components/VentaList'

const VS_SCRIPT_URL = process.env.NEXT_PUBLIC_VS_SCRIPT_URL
const NAVY = '#1A2238'

export default function VentasSegundaPage() {
  const [usuario, setUsuario]       = useState(null)   // null = Comercial (sin PIN)
  const [mostrarLogin, setLogin]    = useState(false)
  const [pinInput, setPinInput]     = useState('')
  const [pinError, setPinError]     = useState('')
  const [ventas, setVentas]         = useState([])
  const [cargando, setCargando]     = useState(false)
  const [errorData, setErrorData]   = useState(null)
  const [ultimaAct, setUltimaAct]   = useState(null)
  const [busqueda, setBusqueda]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState(null)

  // Carga inicial sin necesidad de PIN
  const cargarVentas = useCallback(async () => {
    if (!VS_SCRIPT_URL) { setErrorData('Variable NEXT_PUBLIC_VS_SCRIPT_URL no configurada.'); return }
    setCargando(true)
    setErrorData(null)
    try {
      const res  = await fetch(VS_SCRIPT_URL, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
      const data = await res.json()
      // El Apps Script devuelve { ok: false, error: "..." } cuando falla internamente.
      // Sin esta verificación, el error se oculta y ventas queda vacío.
      if (data && data.ok === false) throw new Error(data.error || 'Error en el servidor')
      const filas = Array.isArray(data) ? data : (data.filas || [])
      setVentas(parsearVentas(filas))
      setUltimaAct(new Date())
    } catch (e) {
      setErrorData(e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarVentas() }, [cargarVentas])

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

  // Calcular estado una sola vez por venta para no llamar derivarEstadoVS múltiples veces
  const estados = ventas.map(v => derivarEstadoVS(v))
  const count = (e) => estados.filter(x => x === e).length

  // Filtrado por click en metric card (toggle)
  const toggleFiltro = (estado) => setFiltroEstado(prev => prev === estado ? null : estado)
  const ventasFiltradas = filtroEstado
    ? ventas.filter((_, i) => estados[i] === filtroEstado)
    : ventas

  const stats = {
    ingresados:      count('INGRESADO'),
    confirmados:     count('CONFIRMADO'),
    agendados:       count('EN_CITA'),
    citaConfirmada:  count('CITA_CONFIRMADA'),
    docsObservados:  count('DOCS_OBSERVADOS'),
    reagendar:       count('PENDIENTE_REAGENDA'),
    firmados:        count('FIRMADO'),
    inscritos:       count('INSCRITO'),
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
                  <button onClick={cargarVentas} disabled={cargando} title="Actualizar"
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
                  <button onClick={cargarVentas} disabled={cargando} title="Actualizar"
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

          {/* Botón volver */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 6 }}>
            <a href="/"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500,
                color: '#9BB4D8', textDecoration: 'none', padding: '4px 8px',
                borderRadius: 6, border: '0.5px solid #2D3A5A' }}>
              {'← Proceso de Desembolso'}
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

      {/* CONTENIDO */}
      <main style={{ maxWidth: 512, margin: '0 auto', padding: '16px 12px 40px' }}>

        {/* Cards de métricas — click para filtrar lista */}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
          <MetricCard label="INGRESADOS"      count={stats.ingresados}     color="#1E40AF" estado="INGRESADO"          activo={filtroEstado} onToggle={toggleFiltro} />
          <MetricCard label="CONFIRMADOS"     count={stats.confirmados}    color="#92400E" estado="CONFIRMADO"         activo={filtroEstado} onToggle={toggleFiltro} />
          <MetricCard label="AGENDADOS"       count={stats.agendados}      color="#065F46" estado="EN_CITA"            activo={filtroEstado} onToggle={toggleFiltro} />
          <MetricCard label="CITA OK"         count={stats.citaConfirmada} color="#3730A3" estado="CITA_CONFIRMADA"    activo={filtroEstado} onToggle={toggleFiltro} />
          <MetricCard label="DOCS OBSERVADOS" count={stats.docsObservados} color="#DC2626" estado="DOCS_OBSERVADOS"    activo={filtroEstado} onToggle={toggleFiltro} />
          <MetricCard label="REAGENDAR"       count={stats.reagendar}      color="#B45309" estado="PENDIENTE_REAGENDA" activo={filtroEstado} onToggle={toggleFiltro} />
          <MetricCard label="FIRMADOS"        count={stats.firmados}       color="#1D4ED8" estado="FIRMADO"            activo={filtroEstado} onToggle={toggleFiltro} />
          <MetricCard label="INSCRITOS"       count={stats.inscritos}      color="#166534" estado="INSCRITO"           activo={filtroEstado} onToggle={toggleFiltro} />
        </div>

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
    </div>
  )
}

function MetricCard({ label, count, color, estado, activo, onToggle }) {
  const isActive = activo === estado
  return (
    <div onClick={() => onToggle(estado)}
      style={{
        background: isActive ? color + '12' : 'white',
        border: isActive ? `2px solid ${color}` : '1.5px solid #D9D4C8',
        borderRadius: 12,
        padding: isActive ? '13px 15px' : '14px 16px',
        cursor: 'pointer',
        transition: 'border 0.12s, background 0.12s',
      }}>
      <div style={{ fontSize: 36, fontWeight: 700, color: '#1A2238', lineHeight: 1.1 }}>{count}</div>
      <div style={{
        fontSize: 10, fontWeight: 700, color,
        marginTop: 6, letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>{label}</div>
    </div>
  )
}

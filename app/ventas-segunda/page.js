'use client'
// app/page.js — Ventas de Segunda (app standalone)
// Equivale al anterior app/ventas-segunda/page.js pero con imports ajustados
// y el tab switch apuntando al proyecto Desembolso via env var.

import { useState, useEffect, useCallback } from 'react'
import { autenticarVS } from '../../lib/auth'
import { parsearVentas } from '../../lib/ventas-segunda/parseSheets'
import { derivarEstadoVS, ESTADO_CONFIG_VS } from '../../lib/ventas-segunda/utils'
import VentaList from './components/VentaList'

const VS_SCRIPT_URL      = process.env.NEXT_PUBLIC_VS_SCRIPT_URL
const DESEMBOLSO_URL     = process.env.NEXT_PUBLIC_DESEMBOLSO_URL || '#'

const NAVY = '#1A2238'
const CREAM = '#F1EFE8'

export default function VentasSegundaPage() {
  const [usuario,   setUsuario]   = useState(null)
  const [pinInput,  setPinInput]  = useState('')
  const [pinError,  setPinError]  = useState('')
  const [ventas,    setVentas]    = useState([])
  const [cargando,  setCargando]  = useState(false)
  const [errorData, setErrorData] = useState(null)
  const [ultimaAct, setUltimaAct] = useState(null)
  const [busqueda,  setBusqueda]  = useState('')

  const verificarPin = () => {
    const usr = autenticarVS(pinInput)
    if (usr) {
      setUsuario(usr)
      setPinError('')
      setPinInput('')
    } else {
      setPinError('PIN incorrecto. Inténtalo de nuevo.')
      setPinInput('')
    }
  }

  const cerrarSesion = () => {
    setUsuario(null)
    setVentas([])
    setBusqueda('')
  }

  const cargarVentas = useCallback(async () => {
    if (!VS_SCRIPT_URL) {
      setErrorData('Variable NEXT_PUBLIC_VS_SCRIPT_URL no configurada.')
      return
    }
    setCargando(true)
    setErrorData(null)
    try {
      const res = await fetch(VS_SCRIPT_URL, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status} al obtener datos`)
      const data = await res.json()
      const filas = Array.isArray(data) ? data : (data.filas || [])
      setVentas(parsearVentas(filas))
      setUltimaAct(new Date())
    } catch (e) {
      setErrorData(e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (usuario) cargarVentas()
  }, [usuario, cargarVentas])

  const resumen = ventas.reduce((acc, v) => {
    const e = derivarEstadoVS(v)
    acc[e] = (acc[e] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ background: CREAM, minHeight: '100vh' }}>

      {/* HEADER */}
      <header style={{ backgroundColor: NAVY, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 512, margin: '0 auto', padding: '10px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }}>
            <h1 style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: 0 }}>GoTrack</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {usuario && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{usuario.nombre}</span>
                  <button onClick={cargarVentas} disabled={cargando} title="Actualizar"
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 16, cursor: 'pointer' }}>
                    🔄
                  </button>
                  <button onClick={cerrarSesion} title="Cerrar sesión"
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6,
                             color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer', padding: '3px 8px' }}>
                    Salir
                  </button>
                </>
              )}
            </div>
          </div>
<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '8px' }}>
  
    href="/"
    style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', fontWeight: '500', color: '#9BB4D8',
      textDecoration: 'none', padding: '4px 8px',
      borderRadius: '6px', border: '0.5px solid #2D3A5A',
    }}
  >
    {'← Proceso de Desembolso'}
  </a>
</div>
          {/* Tab switch — Desembolso apunta al proyecto externo */}
          <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <a
              href={DESEMBOLSO_URL}
              style={{ flex: 1, textAlign: 'center', padding: '8px 0', fontSize: 13, fontWeight: 500,
                       color: 'rgba(255,255,255,0.6)', textDecoration: 'none', borderBottom: '2px solid transparent' }}
            >
              Proceso de Desembolso
            </a>
            <span style={{ flex: 1, textAlign: 'center', padding: '8px 0', fontSize: 13, fontWeight: 700,
                           color: 'white', borderBottom: '2px solid white', cursor: 'default' }}>
              Ventas de Segunda
            </span>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main style={{ maxWidth: 512, margin: '0 auto', padding: '16px 12px 40px' }}>

        {/* Gate PIN */}
        {!usuario ? (
          <div style={{ paddingTop: 40 }}>
            <div style={{ background: 'white', borderRadius: 12, padding: 28,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏍️</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: '0 0 4px' }}>
                  Ventas de Segunda
                </h2>
                <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                  Sección de acceso restringido — ingresa tu PIN
                </p>
              </div>

              <input
                type="password"
                inputMode="numeric"
                maxLength={20}
                value={pinInput}
                onChange={e => { setPinInput(e.target.value); setPinError('') }}
                onKeyDown={e => e.key === 'Enter' && verificarPin()}
                placeholder="PIN de acceso"
                autoComplete="off"
                style={{
                  display: 'block', width: '100%', boxSizing: 'border-box',
                  border: pinError ? '1.5px solid #EF4444' : '1.5px solid #D1D5DB',
                  borderRadius: 8, padding: '10px 14px', fontSize: 16,
                  textAlign: 'center', letterSpacing: 6, marginBottom: 8, outline: 'none',
                }}
              />

              {pinError && (
                <p style={{ color: '#DC2626', fontSize: 12, textAlign: 'center', margin: '0 0 8px' }}>
                  {pinError}
                </p>
              )}

              <button
                onClick={verificarPin}
                disabled={!pinInput.trim()}
                style={{
                  display: 'block', width: '100%',
                  background: pinInput.trim() ? NAVY : '#9CA3AF',
                  color: 'white', border: 'none', borderRadius: 8,
                  padding: '11px 0', fontSize: 14, fontWeight: 700,
                  cursor: pinInput.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Acceder
              </button>

              <p style={{ fontSize: 11, color: '#D1D5DB', textAlign: 'center', marginTop: 16 }}>
                Contacta al área legal para obtener tu PIN.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Resumen de estados */}
            {ventas.length > 0 && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
                {Object.entries(resumen).map(([est, cnt]) => {
                  const cfg = ESTADO_CONFIG_VS[est]
                  if (!cfg) return null
                  return (
                    <div key={est} style={{ flexShrink: 0, fontSize: 11, fontWeight: 600,
                      padding: '4px 10px', borderRadius: 12, color: cfg.colorText,
                      background: cfg.bgBadge, border: `1px solid ${cfg.borderBadge}` }}>
                      {cfg.labelCorto}: {cnt}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Buscador */}
            <div style={{ marginBottom: 12, position: 'relative' }}>
              <input
                type="search"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por placa, nombre o DNI..."
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #D1D5DB',
                         borderRadius: 8, padding: '9px 14px 9px 36px', fontSize: 13,
                         background: 'white', outline: 'none' }}
              />
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
              <VentaList ventas={ventas} busqueda={busqueda} rol={usuario.rol} onActualizar={cargarVentas} />
            )}

            {ultimaAct && !cargando && (
              <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 12 }}>
                Actualizado: {ultimaAct.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  )
}

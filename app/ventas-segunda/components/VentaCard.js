'use client'
// app/components/VentaCard.js
import { useState } from 'react'
import { derivarEstadoVS, ESTADO_CONFIG_VS } from '../../../lib/ventas-segunda/utils'
import { puedeVerPagos, puedeObservarDocs } from '../../../lib/auth'

const VS_SCRIPT_URL = process.env.NEXT_PUBLIC_VS_SCRIPT_URL

async function llamarScript(params) {
  const url = new URL(VS_SCRIPT_URL)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

export default function VentaCard({ venta, rol, onActualizar }) {
  const estado     = derivarEstadoVS(venta)
  const config     = ESTADO_CONFIG_VS[estado]
  const verPagos   = puedeVerPagos(rol)
  const verObsDocs = puedeObservarDocs(rol)

  const [expandido, setExpandido] = useState(false)
  const [cargando,  setCargando]  = useState(false)
  const [error,     setError]     = useState(null)
  const [modoObs,   setModoObs]   = useState(false)
  const [textObs,   setTextObs]   = useState('')
  const [modoCita,  setModoCita]  = useState(false)
  const [fechaCita, setFechaCita] = useState('')
  const [horaCita,  setHoraCita]  = useState('')

  const ejecutarAccion = async (params) => {
    setCargando(true); setError(null)
    try {
      await llamarScript({ row: venta._idx, ...params })
      onActualizar()
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  const agendarCita = () => {
    if (!fechaCita || !horaCita) return
    ejecutarAccion({ action: 'agendar_cita', fecha: fechaCita, hora: horaCita })
    setModoCita(false); setFechaCita(''); setHoraCita('')
  }

  const observarDocs = () => {
    if (!textObs.trim()) return
    ejecutarAccion({ action: 'observar_docs', obs: textObs.trim() })
    setModoObs(false); setTextObs('')
  }

  const btn = (bg, color = 'white') => ({
    fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 6,
    border: 'none', background: bg, color, cursor: cargando ? 'not-allowed' : 'pointer',
    opacity: cargando ? 0.6 : 1, marginRight: 6, marginTop: 6,
  })
  const input = { border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px',
                  fontSize: 13, width: '100%', marginTop: 4, boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: '#6B7280', marginBottom: 2, display: 'block' }
  const val = { fontSize: 13, color: '#111827', fontWeight: 500 }

  return (
    <div style={{ background: 'white', borderRadius: 10, borderLeft: `4px solid ${config.borderCard}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 10, overflow: 'hidden' }}>

      {/* Cabecera */}
      <div style={{ padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}
           onClick={() => setExpandido(e => !e)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 2 }}>
              {venta.PLACA || '—'}
            </div>
            <div style={{ fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {venta.NOMBRE || '—'}
            </div>
            {venta.FECHA_CITA && (
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                📅 {venta.FECHA_CITA}{venta.HORA_CITA ? ` · ${venta.HORA_CITA}` : ''}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                           color: config.colorText, background: config.bgBadge, border: `1px solid ${config.borderBadge}` }}>
              {config.labelCorto}
            </span>
            <span style={{ fontSize: 18, color: '#9CA3AF' }}>{expandido ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {/* Detalle */}
      {expandido && (
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '12px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 12 }}>
            <div><span style={lbl}>DNI / CE</span><span style={val}>{venta.DNI || '—'}</span></div>
            <div><span style={lbl}>Teléfono</span><span style={val}>{venta.TELEFONO || '—'}</span></div>
            {verPagos && (
              <>
                <div><span style={lbl}>Pago del Vehículo</span><span style={val}>{venta.PAGO_VEHICULO || '—'}</span></div>
                <div><span style={lbl}>Pago Notariales</span><span style={val}>{venta.PAGO_NOTARIALES || '—'}</span></div>
              </>
            )}
          </div>

          {(venta.FOTO_DNI_ANV || venta.FOTO_DNI_REV) && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {venta.FOTO_DNI_ANV && <a href={venta.FOTO_DNI_ANV} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: '#185FA5', textDecoration: 'underline' }}>📄 DNI Anverso</a>}
              {venta.FOTO_DNI_REV && <a href={venta.FOTO_DNI_REV} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: '#185FA5', textDecoration: 'underline' }}>📄 DNI Reverso</a>}
            </div>
          )}

          {venta.OBSERVACION_DOCS && (
            <div style={{ background: '#FAECE7', borderRadius: 6, padding: '8px 10px', marginBottom: 12,
                          borderLeft: '3px solid #D85A30' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#993C1D', display: 'block', marginBottom: 2 }}>OBSERVACIÓN DOCS</span>
              <span style={{ fontSize: 13, color: '#7C2D12' }}>{venta.OBSERVACION_DOCS}</span>
            </div>
          )}

          {venta.OBSERVACIONES && (
            <div style={{ background: '#F9FAFB', borderRadius: 6, padding: '8px 10px', marginBottom: 12,
                          borderLeft: '3px solid #D1D5DB' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 2 }}>HISTORIAL</span>
              <span style={{ fontSize: 12, color: '#374151', whiteSpace: 'pre-wrap' }}>{venta.OBSERVACIONES}</span>
            </div>
          )}

          {error && <div style={{ color: '#991B1B', fontSize: 12, background: '#FEF2F2', borderRadius: 6,
                                  padding: '6px 10px', marginBottom: 8 }}>{error}</div>}

          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {!venta.FECHA_CITA && !venta.SIN_CITA && !venta.FECHA_FIRMA && !venta.FECHA_INSCRIPCION && (
              <button style={btn('#185FA5')} onClick={() => setModoCita(m => !m)} disabled={cargando}>📅 Agendar cita</button>
            )}
            {!venta.SIN_CITA && !venta.FECHA_FIRMA && !venta.FECHA_INSCRIPCION && (
              <button style={btn('#BA7517')} onClick={() => ejecutarAccion({ action: 'sin_cita' })} disabled={cargando}>Sin cita</button>
            )}
            {verObsDocs && !venta.OBSERVACION_DOCS && !venta.FECHA_FIRMA && !venta.FECHA_INSCRIPCION && (
              <button style={btn('#D85A30')} onClick={() => setModoObs(m => !m)} disabled={cargando}>🔴 Observar docs</button>
            )}
            {verObsDocs && venta.OBSERVACION_DOCS && !venta.FECHA_FIRMA && !venta.FECHA_INSCRIPCION && (
              <button style={btn('#0F6E56')} onClick={() => ejecutarAccion({ action: 'resolver_obs' })} disabled={cargando}>✅ Resolver obs.</button>
            )}
            {!venta.GM_SOLICITADA && !venta.OBSERVACION_DOCS && (venta.SIN_CITA || venta.FECHA_CITA) && !venta.FECHA_FIRMA && !venta.FECHA_INSCRIPCION && (
              <button style={btn('#0A7B6F')} onClick={() => ejecutarAccion({ action: 'solicitar_gm' })} disabled={cargando}>Solicitar GM</button>
            )}
            {venta.GM_SOLICITADA && !venta.GM_LEVANTADA && !venta.OBSERVACION_DOCS && !venta.FECHA_FIRMA && !venta.FECHA_INSCRIPCION && (
              <button style={btn('#0F6E56')} onClick={() => ejecutarAccion({ action: 'levantar_gm' })} disabled={cargando}>Levantar GM</button>
            )}
            {venta.GM_LEVANTADA && !venta.FECHA_FIRMA && !venta.FECHA_INSCRIPCION && (
              <button style={btn('#3B4BA8')} onClick={() => ejecutarAccion({ action: 'firmar' })} disabled={cargando}>✍️ Registrar firma</button>
            )}
            {venta.FECHA_FIRMA && !venta.FECHA_INSCRIPCION && (
              <button style={btn('#1A6B3E')} onClick={() => ejecutarAccion({ action: 'inscribir' })} disabled={cargando}>Inscribir en RRPP</button>
            )}
          </div>

          {modoCita && (
            <div style={{ marginTop: 10, background: '#EFF6FF', borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#1E3A5F' }}>Agendar cita</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><label style={lbl}>Fecha</label><input type="date" value={fechaCita} onChange={e => setFechaCita(e.target.value)} style={input} /></div>
                <div><label style={lbl}>Hora</label><input type="time" value={horaCita} onChange={e => setHoraCita(e.target.value)} style={input} /></div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <button style={btn('#185FA5')} onClick={agendarCita} disabled={!fechaCita || !horaCita || cargando}>Confirmar</button>
                <button style={btn('#6B7280')} onClick={() => setModoCita(false)}>Cancelar</button>
              </div>
            </div>
          )}

          {modoObs && (
            <div style={{ marginTop: 10, background: '#FFF7F5', borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#7C2D12' }}>Registrar observación</div>
              <textarea value={textObs} onChange={e => setTextObs(e.target.value)} rows={3}
                placeholder="Describe el documento faltante u observado..."
                style={{ ...input, resize: 'vertical' }} />
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <button style={btn('#D85A30')} onClick={observarDocs} disabled={!textObs.trim() || cargando}>Registrar</button>
                <button style={btn('#6B7280')} onClick={() => setModoObs(false)}>Cancelar</button>
              </div>
            </div>
          )}

          {cargando && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8, textAlign: 'center' }}>Guardando...</div>}
        </div>
      )}
    </div>
  )
}

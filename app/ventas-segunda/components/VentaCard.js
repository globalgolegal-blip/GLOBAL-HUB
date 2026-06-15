'use client'
// app/ventas-segunda/components/VentaCard.js
// Muestra acciones y documentos según el rol del usuario.
//
// rol === null     → Comercial: puede agendar/sin_cita en estado CONFIRMADO
// rol === 'tesoreria' → confirmar_a_notaria, observar, GM, inscribir
// rol === 'notaria'   → confirmar_cita (ventana 30 min), observar, firmar
// rol === 'legal'     → observar cualquier etapa

import { useState } from 'react'
import {
  derivarEstadoVS,
  ESTADO_CONFIG_VS,
  validarAnticipacionCita,
  puedeConfirmarCita,
} from '../../../lib/ventas-segunda/utils'
import { getPermisos } from '../../../lib/auth'

const VS_URL = process.env.NEXT_PUBLIC_VS_SCRIPT_URL

const NAVY  = '#1A2238'
const CREAM = '#F1EFE8'

// ── Helpers de UI ────────────────────────────────────────────

function Btn({ onClick, disabled, color = NAVY, children, small }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        background: disabled ? '#E5E7EB' : color,
        color: disabled ? '#9CA3AF' : 'white',
        border: 'none', borderRadius: 6,
        padding: small ? '5px 10px' : '7px 14px',
        fontSize: small ? 11 : 12, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
      }}>
      {children}
    </button>
  )
}

function LinkDoc({ url, label }) {
  if (!url || !url.includes('drive.google.com')) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 12, color: '#2563EB', textDecoration: 'none',
        background: '#EFF6FF', border: '1px solid #BFDBFE',
        borderRadius: 6, padding: '3px 8px' }}>
      📎 {label}
    </a>
  )
}

// ── Componente principal ─────────────────────────────────────

export default function VentaCard({ venta, idx, rol, onActualizar }) {
  const estado  = derivarEstadoVS(venta)
  const cfg     = ESTADO_CONFIG_VS[estado] || ESTADO_CONFIG_VS.INGRESADO
  const permisos = getPermisos(rol)

  const [expandido,    setExpandido]    = useState(false)
  const [cargando,     setCargando]     = useState(false)
  const [agendaOpen,   setAgendaOpen]   = useState(false)
  const [obsOpen,      setObsOpen]      = useState(false)
  const [fechaCita,    setFechaCita]    = useState('')
  const [horaCita,     setHoraCita]     = useState('')
  const [obsTexto,     setObsTexto]     = useState('')
  const [msg,          setMsg]          = useState(null)   // { tipo: 'ok'|'err', texto }

  const puedeAccion = (accion) => permisos.acciones.includes(accion)

  const puedeObservar = puedeAccion('observar_docs') && (
    permisos.estadosObservar === '*' || permisos.estadosObservar.includes(estado)
  )

  // ── Llamada a la API ───────────────────────────────────────
  async function llamarAPI(params) {
    if (!VS_URL) return setMsg({ tipo: 'err', texto: 'URL de script no configurada.' })
    setCargando(true)
    setMsg(null)
    try {
      const qs  = new URLSearchParams({ row: idx, ...params }).toString()
      const res = await fetch(`${VS_URL}?${qs}`, { cache: 'no-store' })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Error desconocido')
      setMsg({ tipo: 'ok', texto: 'Actualizado correctamente.' })
      setAgendaOpen(false)
      setObsOpen(false)
      setTimeout(() => { setMsg(null); onActualizar?.() }, 1200)
    } catch (e) {
      setMsg({ tipo: 'err', texto: e.message })
    } finally {
      setCargando(false)
    }
  }

  // ── Acciones ───────────────────────────────────────────────
  const confirmarANotaria  = () => llamarAPI({ action: 'confirmar_a_notaria' })
  const confirmarCita      = () => llamarAPI({ action: 'confirmar_cita' })
  const marcarSinCita      = () => llamarAPI({ action: 'sin_cita' })
  const solicitarGM        = () => llamarAPI({ action: 'solicitar_gm' })
  const levantarGM         = () => llamarAPI({ action: 'levantar_gm' })
  const firmar             = () => llamarAPI({ action: 'firmar' })
  const inscribir          = () => llamarAPI({ action: 'inscribir' })
  const resolverObs        = () => llamarAPI({ action: 'resolver_obs' })

  const agendarCita = () => {
    if (!validarAnticipacionCita(fechaCita, horaCita)) return
    llamarAPI({ action: 'agendar_cita', fecha: fechaCita, hora: horaCita })
  }

  const enviarObservacion = () => {
    if (!obsTexto.trim()) return
    llamarAPI({ action: 'observar_docs', obs: obsTexto.trim() })
  }

  // Validaciones de tiempo
  const citaValida         = validarAnticipacionCita(fechaCita, horaCita)
  const confirmacionActiva = puedeConfirmarCita(venta.fechaCita, venta.horaCita)

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ background: 'white', borderRadius: 12, marginBottom: 10,
      border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

      {/* Cabecera siempre visible */}
      <div onClick={() => setExpandido(v => !v)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: NAVY }}>{venta.placa}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              color: cfg.colorText, background: cfg.bgBadge, border: `1px solid ${cfg.borderBadge}` }}>
              {cfg.labelCorto}
            </span>
          </div>
          <span style={{ fontSize: 12, color: '#6B7280' }}>{venta.nombre}</span>
        </div>
        <span style={{ color: '#9CA3AF', fontSize: 18 }}>{expandido ? '▲' : '▼'}</span>
      </div>

      {/* Cuerpo expandido */}
      {expandido && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #F3F4F6' }}>

          {/* Datos básicos */}
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
            <InfoRow label="DNI/CE"    value={venta.dni} />
            <InfoRow label="Teléfono"  value={venta.telefono} />
            {venta.fechaCita && <InfoRow label="Cita" value={`${venta.fechaCita} ${venta.horaCita || ''}`} />}
            {venta.sinCita   && <InfoRow label="Sin cita" value="Sí — directo a firma" />}
            {venta.observacionDocs && (
              <div style={{ gridColumn: '1/-1' }}>
                <InfoRow label="Obs. docs" value={venta.observacionDocs} warn />
              </div>
            )}
            {venta.observaciones && (
              <div style={{ gridColumn: '1/-1' }}>
                <InfoRow label="Historial" value={venta.observaciones} small />
              </div>
            )}
          </div>

          {/* Documentos — solo para tesoreria, notaria, legal */}
          {permisos.verDocumentos && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <LinkDoc url={venta.pagoVehiculo}    label="Pago vehículo"   />
              <LinkDoc url={venta.fotoDniAnv}      label="DNI Anverso"     />
              <LinkDoc url={venta.fotoDniRev}      label="DNI Reverso"     />
              <LinkDoc url={venta.pagoNotariales}  label="Pago notariales" />
            </div>
          )}

          {/* Mensaje de feedback */}
          {msg && (
            <div style={{ marginTop: 10, padding: '7px 10px', borderRadius: 6, fontSize: 12,
              background: msg.tipo === 'ok' ? '#F0FDF4' : '#FEF2F2',
              color:      msg.tipo === 'ok' ? '#166534'  : '#991B1B',
              border: `1px solid ${msg.tipo === 'ok' ? '#86EFAC' : '#FECACA'}` }}>
              {msg.texto}
            </div>
          )}

          {/* ── ACCIONES POR ROL ─────────────────────────── */}
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* COMERCIAL (sin PIN): agendar/reagendar en CONFIRMADO o PENDIENTE_REAGENDA */}
            {!rol && (estado === 'CONFIRMADO' || estado === 'PENDIENTE_REAGENDA') && (
              <>
                {!agendaOpen ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn onClick={() => setAgendaOpen(true)} color="#2563EB">
                      {estado === 'PENDIENTE_REAGENDA' ? '🔄 Reagendar cita' : '📅 Agendar cita'}
                    </Btn>
                    {estado === 'CONFIRMADO' && (
                      <Btn onClick={marcarSinCita} disabled={cargando} color="#92400E" small>Sin cita</Btn>
                    )}
                  </div>
                ) : (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0',
                    borderRadius: 8, padding: 10 }}>
                    <p style={{ fontSize: 12, color: '#374151', margin: '0 0 8px', fontWeight: 600 }}>
                      Agendar cita — mínimo 2 horas de anticipación
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input type="date" value={fechaCita} onChange={e => setFechaCita(e.target.value)}
                        style={inputStyle} />
                      <input type="time" value={horaCita} onChange={e => setHoraCita(e.target.value)}
                        style={inputStyle} />
                    </div>
                    {fechaCita && horaCita && !citaValida && (
                      <p style={{ fontSize: 11, color: '#DC2626', margin: '0 0 6px' }}>
                        ⚠ La cita debe ser con al menos 2 horas de anticipación.
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn onClick={agendarCita} disabled={!citaValida || cargando} color="#2563EB">
                        Confirmar
                      </Btn>
                      <Btn onClick={() => setAgendaOpen(false)} color="#6B7280" small>Cancelar</Btn>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TESORERÍA */}
            {rol === 'tesoreria' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {estado === 'INGRESADO' && puedeAccion('confirmar_a_notaria') && (
                  <Btn onClick={confirmarANotaria} disabled={cargando} color="#0F766E">
                    ✅ Confirmar a Notaría
                  </Btn>
                )}
                {(estado === 'CITA_CONFIRMADA' || estado === 'SIN_CITA') && puedeAccion('solicitar_gm') && !venta.gmSolicitada && (
                  <Btn onClick={solicitarGM} disabled={cargando} color="#7C3AED" small>Solicitar GM</Btn>
                )}
                {venta.gmSolicitada && !venta.gmLevantada && puedeAccion('levantar_gm') && (
                  <Btn onClick={levantarGM} disabled={cargando} color="#065F46" small>Levantar GM</Btn>
                )}
                {venta.fechaFirma && !venta.fechaInscripcion && puedeAccion('inscribir') && (
                  <Btn onClick={inscribir} disabled={cargando} color="#1D4ED8" small>Inscribir RRPP</Btn>
                )}
                {puedeObservar && !obsOpen && (
                  <Btn onClick={() => setObsOpen(true)} color="#9D174D" small>Observar docs</Btn>
                )}
                {estado === 'DOCS_OBSERVADOS' && puedeAccion('resolver_obs') && (
                  <Btn onClick={resolverObs} disabled={cargando} color="#065F46" small>Resolver obs.</Btn>
                )}
              </div>
            )}

            {/* NOTARÍA */}
            {rol === 'notaria' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {estado === 'EN_CITA' && puedeAccion('confirmar_cita') && (
                  <div>
                    <Btn onClick={confirmarCita} disabled={!confirmacionActiva || cargando} color="#0F766E">
                      ✅ Confirmar cita
                    </Btn>
                    {!confirmacionActiva && (
                      <p style={{ fontSize: 11, color: '#DC2626', margin: '4px 0 0' }}>
                        El plazo de confirmación venció. Comercial debe reagendar.
                      </p>
                    )}
                  </div>
                )}
                {(estado === 'CITA_CONFIRMADA' || estado === 'SIN_CITA' || estado === 'GM_LEVANTADA') && puedeAccion('firmar') && !venta.fechaFirma && (
                  <Btn onClick={firmar} disabled={cargando} color="#1D4ED8" small>Registrar firma</Btn>
                )}
                {puedeObservar && !obsOpen && (
                  <Btn onClick={() => setObsOpen(true)} color="#9D174D" small>Observar docs</Btn>
                )}
                {estado === 'DOCS_OBSERVADOS' && puedeAccion('resolver_obs') && (
                  <Btn onClick={resolverObs} disabled={cargando} color="#065F46" small>Resolver obs.</Btn>
                )}
              </div>
            )}

            {/* LEGAL */}
            {rol === 'legal' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {puedeObservar && !obsOpen && (
                  <Btn onClick={() => setObsOpen(true)} color="#9D174D" small>Observar docs</Btn>
                )}
                {estado === 'DOCS_OBSERVADOS' && puedeAccion('resolver_obs') && (
                  <Btn onClick={resolverObs} disabled={cargando} color="#065F46" small>Resolver obs.</Btn>
                )}
              </div>
            )}

            {/* Modal de observación (compartido por todos los roles) */}
            {obsOpen && (
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA',
                borderRadius: 8, padding: 10 }}>
                <p style={{ fontSize: 12, color: '#92400E', margin: '0 0 8px', fontWeight: 600 }}>
                  Observación de documentos
                </p>
                <textarea value={obsTexto} onChange={e => setObsTexto(e.target.value)}
                  placeholder="Describe el problema con los documentos..."
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #FCD34D',
                    borderRadius: 6, padding: '7px 10px', fontSize: 12, resize: 'vertical', outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <Btn onClick={enviarObservacion} disabled={!obsTexto.trim() || cargando} color="#9D174D">
                    Guardar observación
                  </Btn>
                  <Btn onClick={() => setObsOpen(false)} color="#6B7280" small>Cancelar</Btn>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers de display ───────────────────────────────────────

function InfoRow({ label, value, warn, small }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 2 }}>
      <span style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase',
        letterSpacing: '0.04em', fontWeight: 600 }}>{label}: </span>
      <span style={{ fontSize: small ? 11 : 12, color: warn ? '#9D174D' : '#374151',
        whiteSpace: 'pre-wrap' }}>{value}</span>
    </div>
  )
}

const inputStyle = {
  flex: 1, border: '1px solid #D1D5DB', borderRadius: 6,
  padding: '6px 8px', fontSize: 13, outline: 'none',
}

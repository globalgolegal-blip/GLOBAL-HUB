'use client'
import { useState } from 'react'
import { ESTADO_CONFIG, extraerIntentos } from '../lib/utils'

function fmt(val) {
  if (!val) return '—'
  const s = String(val).trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s
  const d = new Date(s)
  if (isNaN(d)) return s
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function isHoy(val) {
  if (!val) return false
  const s = String(val).trim()
  let d
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const p = s.split('/')
    d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]))
  } else {
    d = new Date(s)
  }
  if (isNaN(d)) return false
  const hoy = new Date()
  return d.getFullYear() === hoy.getFullYear()
      && d.getMonth()    === hoy.getMonth()
      && d.getDate()     === hoy.getDate()
}

// Retorna true si la fecha de vencimiento fue exactamente ayer (vencido por solo 1 día)
// Retorna "hace Xh Ym" o "hace Xm" a partir de un timestamp 'yyyy/MM/dd HH:mm'
function tiempoTranscurrido(val) {
  if (!val) return null
  const s = String(val).trim()
  // formato yyyy/MM/dd HH:mm → Date
  const m = s.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/)
  if (!m) return null
  const d = new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]), parseInt(m[4]), parseInt(m[5]))
  if (isNaN(d)) return null
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `hace ${hrs}h ${rem}m` : `hace ${hrs}h`
}

function isVencidoAyer(val) {
  if (!val) return false
  const s = String(val).trim()
  let d
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const p = s.split('/')
    d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]))
  } else {
    d = new Date(s)
  }
  if (isNaN(d)) return false
  const ayer = new Date()
  ayer.setHours(0, 0, 0, 0)
  ayer.setDate(ayer.getDate() - 1)
  return d.getFullYear() === ayer.getFullYear()
      && d.getMonth()    === ayer.getMonth()
      && d.getDate()     === ayer.getDate()
}

export default function ContractCard({
  contrato, numero, onSolicitarValidacion, acAutenticado,
  onSolicitarReenvio, onSolicitarReenvioVencido,
  legalAutenticado, onLegalValidar, onLegalObservar,
  onLegalMarcarPendiente, onLegalConfirmarReenvio, onLegalReenviarVencido,
}) {
  const [enviando,               setEnviando]               = useState(false)
  const [enviandoReenvio,        setEnviandoReenvio]        = useState(false)
  const [enviandoReenvioVencido, setEnviandoReenvioVencido] = useState(false)
  // Estados para acciones del Modo Legal
  const [enviandoLVal,    setEnviandoLVal]    = useState(false)
  const [enviandoLObs,    setEnviandoLObs]    = useState(false)
  const [enviandoLPend,   setEnviandoLPend]   = useState(false)
  const [enviandoLCR,     setEnviandoLCR]     = useState(false)
  const [enviandoLRV,     setEnviandoLRV]     = useState(false)
  const [nuevaFechaLegal, setNuevaFechaLegal] = useState('')

  const estado      = contrato._estado || 'INGRESADO'
  const cfg         = ESTADO_CONFIG[estado] || ESTADO_CONFIG['INGRESADO']
  const esObservado = estado === 'CONTRATO_OBSERVADO'
  const intentos    = extraerIntentos(contrato)

  const solicitudVal             = String(contrato['SOLICITUD'] || '').toUpperCase()
  const reenvioSolicitado        = solicitudVal.startsWith('REENVIAR') && !solicitudVal.startsWith('REENVIAR_VENCIDO')
  const reenvioVencidoSolicitado = solicitudVal.startsWith('REENVIAR_VENCIDO')

  const venceHoy = (estado === 'PENDIENTE' || estado === 'SOLICITADO')
                && isHoy(contrato['FECHA DE VENCIMIENTO'])
  const clienteSinFirmar = estado === 'PENDIENTE'
                        && String(contrato['CONTRATO FIRMADO CONFORME'] || '').trim().toUpperCase() === 'PENDIENTE'

  // Vencido hace exactamente 1 día y col P es VENCIDO, NO o vacío → aún permite validar
  const firmadoRaw = String(contrato['CONTRATO FIRMADO CONFORME'] || '').trim().toUpperCase()
  const puedeValidarVencido = estado === 'VENCIDO'
      && isVencidoAyer(contrato['FECHA DE VENCIMIENTO'])
      && firmadoRaw !== 'SI'
      && firmadoRaw !== 'OBSERVADO'
  // Si se solicitó validación en un contrato vencido-1día, col T tendrá SOLICITADO|N
  const vencidoYaSolicitado = puedeValidarVencido && solicitudVal.startsWith('SOLICITADO')

  async function handleSolicitar() {
    if (enviando) return
    setEnviando(true)
    try { await onSolicitarValidacion(contrato['ID']) }
    finally { setEnviando(false) }
  }

  async function handleReenvio() {
    if (enviandoReenvio) return
    setEnviandoReenvio(true)
    try { await onSolicitarReenvio(contrato['ID']) }
    finally { setEnviandoReenvio(false) }
  }

  async function handleReenvioVencido() {
    if (enviandoReenvioVencido) return
    setEnviandoReenvioVencido(true)
    try { await onSolicitarReenvioVencido(contrato['ID']) }
    finally { setEnviandoReenvioVencido(false) }
  }

  // Handlers Modo Legal
  async function handleLegalValidar() {
    if (enviandoLVal) return
    setEnviandoLVal(true)
    try { await onLegalValidar(contrato['ID']) }
    finally { setEnviandoLVal(false) }
  }
  async function handleLegalObservar() {
    if (enviandoLObs) return
    setEnviandoLObs(true)
    try { await onLegalObservar(contrato['ID']) }
    finally { setEnviandoLObs(false) }
  }
  async function handleLegalPendiente() {
    if (enviandoLPend) return
    setEnviandoLPend(true)
    try { await onLegalMarcarPendiente(contrato['ID']) }
    finally { setEnviandoLPend(false) }
  }
  async function handleLegalConfirmarReenvio() {
    if (enviandoLCR) return
    setEnviandoLCR(true)
    try { await onLegalConfirmarReenvio(contrato['ID']) }
    finally { setEnviandoLCR(false) }
  }
  async function handleLegalReenviarVencido() {
    if (!nuevaFechaLegal || enviandoLRV) return
    setEnviandoLRV(true)
    try { await onLegalReenviarVencido(contrato['ID'], nuevaFechaLegal) }
    finally { setEnviandoLRV(false) }
  }

  const mostrarBloqueReenvio = estado === 'OBSERVADO' && (reenvioSolicitado || acAutenticado)
  // Detección de Modo Legal: por prop explícito O por presencia de callbacks legales (defensivo)
  const enModoLegal = legalAutenticado || typeof onLegalValidar === 'function'
  // Visibilidad bloques legales
  const mostrarLegalValidar  = enModoLegal && (estado === 'SOLICITADO' || puedeValidarVencido)
  const mostrarLegalReenvio  = enModoLegal && estado === 'OBSERVADO' && reenvioSolicitado
  const mostrarLegalVencido  = enModoLegal && estado === 'VENCIDO' && reenvioVencidoSolicitado
  // FECHA SOLICITUD — solo visible para Legal
  const fechaSolVal    = contrato['FECHA SOLICITUD'] || ''
  const tiempoEspera   = enModoLegal ? tiempoTranscurrido(fechaSolVal) : null

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '0.5px solid #D3D1C7',
      borderLeftWidth: '4px',
      borderLeftColor: cfg.borderCard,
      padding: '12px 14px',
    }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
          {numero != null && (
            <span style={{
              flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%',
              background: '#1A2238', color: 'white', fontSize: '10px', fontWeight: '500',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px',
            }}>
              {numero}
            </span>
          )}
          <div style={{ fontWeight: '500', color: '#1A2238', fontSize: '13px', lineHeight: '1.3', textTransform: 'uppercase' }}>
            {contrato['CLIENTE'] || '—'}
          </div>
        </div>
        <span style={{
          flexShrink: 0, fontSize: '10px', fontWeight: '500', padding: '3px 8px',
          borderRadius: '20px', background: cfg.bgBadge, color: cfg.colorText,
          border: `0.5px solid ${cfg.borderBadge}`, whiteSpace: 'nowrap',
        }}>
          {cfg.labelCorto}
        </span>
      </div>

      {/* Banner: vence hoy */}
      {venceHoy && (
        <div style={{
          margin: '0 0 8px', padding: '5px 10px', borderRadius: '6px',
          background: '#FCEBEB', border: '0.5px solid #F09595',
          fontSize: '11px', fontWeight: '600', color: '#A32D2D',
          display: 'flex', alignItems: 'center', gap: '5px',
        }}>
          {'⚠ Vence el dia de hoy — prioridad'}
        </div>
      )}

      {/* Datos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
        <div style={{ fontSize: '11px' }}>
          <span style={{ color: '#5F5E5A', fontWeight: '500' }}>{'DOI: '}</span>
          <span style={{ color: '#444441' }}>{contrato['DOI'] || '—'}</span>
        </div>
        <div style={{ fontSize: '11px' }}>
          <span style={{ color: '#5F5E5A', fontWeight: '500' }}>{'Ciudad: '}</span>
          <span style={{ color: '#444441' }}>{contrato['CIUDAD'] || '—'}</span>
        </div>
        <div style={{ fontSize: '11px', gridColumn: 'span 2' }}>
          <span style={{ color: '#5F5E5A', fontWeight: '500' }}>{'Dealer: '}</span>
          <span style={{ color: '#444441' }}>{contrato['DISTRIBUIDOR'] || '—'}</span>
        </div>
        <div style={{ fontSize: '11px' }}>
          <span style={{ color: '#5F5E5A', fontWeight: '500' }}>{'Celular: '}</span>
          <span style={{ color: '#444441' }}>{contrato['CELULAR DEL CLIENTE'] || contrato['CELULAR'] || '—'}</span>
        </div>
        <div style={{ fontSize: '11px' }}></div>
        <div style={{ fontSize: '11px' }}>
          <span style={{ color: '#5F5E5A', fontWeight: '500' }}>{'Enviado: '}</span>
          <span style={{ color: '#444441' }}>{esObservado ? 'OBSERVADO' : fmt(contrato['FECHA DE ENVÍO'] || contrato['FECHA DE ENVIO'])}</span>
        </div>
        <div style={{ fontSize: '11px' }}>
          <span style={{ color: estado === 'VENCIDO' ? '#A32D2D' : '#5F5E5A', fontWeight: '500' }}>{'Vence: '}</span>
          <span style={{ color: estado === 'VENCIDO' ? '#A32D2D' : '#444441', fontWeight: estado === 'VENCIDO' ? '500' : '400' }}>
            {esObservado ? '—' : fmt(contrato['FECHA DE VENCIMIENTO'])}
          </span>
        </div>
      </div>

      {/* Timestamp de solicitud — solo visible en Modo Legal */}
      {tiempoEspera && (
        <div style={{
          margin: '8px 0 0', padding: '5px 10px', borderRadius: '6px',
          background: '#0F2D1E', border: '0.5px solid #2A7A50',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '10px', color: '#6BCB99', fontWeight: '500' }}>
            {'Solicitud recibida'}
          </span>
          <span style={{ fontSize: '10px', color: '#4DC987', fontWeight: '600' }}>
            {tiempoEspera}
          </span>
        </div>
      )}

      {/* Bloque solicitud — PENDIENTE, SOLICITADO, y VENCIDO de solo 1 día */}
      {(estado === 'PENDIENTE' || estado === 'SOLICITADO' || puedeValidarVencido) && (
        <>
          <div style={{ borderTop: '0.5px solid #D3D1C7', margin: '10px 0' }} />
          {puedeValidarVencido && (
            <div style={{
              marginBottom: '8px', padding: '4px 10px', borderRadius: '6px',
              background: '#FFF8E1', border: '0.5px solid #F5C842',
              fontSize: '10px', fontWeight: '600', color: '#7A5C00',
            }}>
              {'⚠ Vencido ayer — ventana de validacion activa'}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            {(estado === 'SOLICITADO' || vencidoYaSolicitado) ? (
              <div style={{
                fontSize: '11px', fontWeight: '500', padding: '6px 14px',
                borderRadius: '8px', background: '#FFF0E6',
                color: '#CC5500', border: '0.5px solid #ff6600',
              }}>
                {'Validacion ya solicitada'}
              </div>
            ) : (
              <button
                onClick={handleSolicitar}
                disabled={enviando}
                style={{
                  fontSize: '11px', fontWeight: '500', padding: '6px 14px',
                  borderRadius: '8px', background: enviando ? '#B4B2A9' : '#185FA5',
                  color: 'white', border: 'none',
                  cursor: enviando ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
                }}
              >
                {enviando ? 'Enviando...' : 'Solicitar validacion'}
              </button>
            )}
            {intentos > 0 && (
              <span style={{
                fontSize: '10px', fontWeight: '500', padding: '3px 8px',
                borderRadius: '20px', background: '#FFF0E6',
                color: '#CC5500', border: '0.5px solid #ff6600',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {intentos}{intentos === 1 ? ' intento' : ' intentos'}
              </span>
            )}
          </div>
          {clienteSinFirmar && (
            <p style={{ margin: '8px 0 0', fontSize: '10px', color: '#888780', fontStyle: 'italic' }}>
              {'No se validó · El cliente no ha firmado'}
            </p>
          )}
        </>
      )}

      {/* Bloque reenvio — solo OBSERVADO (firma) */}
      {mostrarBloqueReenvio && (
        <>
          <div style={{ borderTop: '0.5px solid #D3D1C7', margin: '10px 0' }} />
          {reenvioSolicitado ? (
            <div style={{
              fontSize: '11px', fontWeight: '500', padding: '6px 14px',
              borderRadius: '8px', background: '#E8F0FE',
              color: '#1A56DB', border: '0.5px solid #4A90D9',
            }}>
              {'Reenvio solicitado'}
            </div>
          ) : (
            <button
              onClick={handleReenvio}
              disabled={enviandoReenvio}
              style={{
                fontSize: '11px', fontWeight: '500', padding: '6px 14px',
                borderRadius: '8px',
                background: enviandoReenvio ? '#B4B2A9' : '#1A2238',
                color: 'white', border: 'none',
                cursor: enviandoReenvio ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {enviandoReenvio ? 'Enviando...' : 'Reenviar contrato'}
            </button>
          )}
        </>
      )}

      {/* Bloque reenvio vencido — solo VENCIDO, solo AAC */}
      {estado === 'VENCIDO' && acAutenticado && (
        <>
          <div style={{ borderTop: '0.5px solid #D3D1C7', margin: '10px 0' }} />
          {reenvioVencidoSolicitado ? (
            <div style={{
              fontSize: '11px', fontWeight: '500', padding: '6px 14px',
              borderRadius: '8px', background: '#E8F6FD',
              color: '#1A7AB5', border: '0.5px solid #87CEEB',
            }}>
              {'Reenvio de vencido solicitado'}
            </div>
          ) : (
            <button
              onClick={handleReenvioVencido}
              disabled={enviandoReenvioVencido}
              style={{
                fontSize: '11px', fontWeight: '500', padding: '6px 14px',
                borderRadius: '8px',
                background: enviandoReenvioVencido ? '#B4B2A9' : '#5DADE2',
                color: 'white', border: 'none',
                cursor: enviandoReenvioVencido ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {enviandoReenvioVencido ? 'Enviando...' : 'Solicitar reenvio'}
            </button>
          )}
        </>
      )}

      {/* ── MODO LEGAL: Validar / Observar / Pendiente ── */}
      {mostrarLegalValidar && (
        <>
          <div style={{ borderTop: '1px solid #2A7A50', margin: '10px 0' }} />
          <p style={{ fontSize: '10px', fontWeight: '600', color: '#4DC987', letterSpacing: '0.06em', marginBottom: '8px' }}>
            {'ACCION LEGAL'}
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={handleLegalValidar}
              disabled={enviandoLVal}
              style={{
                flex: 1, minWidth: '70px', fontSize: '11px', fontWeight: '600',
                padding: '7px 10px', borderRadius: '8px',
                background: enviandoLVal ? '#B4B2A9' : '#1A6B47',
                color: 'white', border: 'none',
                cursor: enviandoLVal ? 'not-allowed' : 'pointer',
              }}
            >
              {enviandoLVal ? '...' : 'Validar'}
            </button>
            <button
              onClick={handleLegalObservar}
              disabled={enviandoLObs}
              style={{
                flex: 1, minWidth: '70px', fontSize: '11px', fontWeight: '600',
                padding: '7px 10px', borderRadius: '8px',
                background: enviandoLObs ? '#B4B2A9' : '#BA7517',
                color: 'white', border: 'none',
                cursor: enviandoLObs ? 'not-allowed' : 'pointer',
              }}
            >
              {enviandoLObs ? '...' : 'Observar'}
            </button>
            <button
              onClick={handleLegalPendiente}
              disabled={enviandoLPend}
              style={{
                flex: 1, minWidth: '70px', fontSize: '11px', fontWeight: '600',
                padding: '7px 10px', borderRadius: '8px',
                background: enviandoLPend ? '#B4B2A9' : '#8B1A1A',
                color: 'white', border: 'none',
                cursor: enviandoLPend ? 'not-allowed' : 'pointer',
              }}
            >
              {enviandoLPend ? '...' : 'Pendiente'}
            </button>
          </div>
        </>
      )}

      {/* ── MODO LEGAL: Confirmar reenvio (OBSERVADO + REENVIAR) ── */}
      {mostrarLegalReenvio && (
        <>
          <div style={{ borderTop: '1px solid #2A7A50', margin: '10px 0' }} />
          <p style={{ fontSize: '10px', fontWeight: '600', color: '#4DC987', letterSpacing: '0.06em', marginBottom: '8px' }}>
            {'ACCION LEGAL'}
          </p>
          <button
            onClick={handleLegalConfirmarReenvio}
            disabled={enviandoLCR}
            style={{
              width: '100%', fontSize: '11px', fontWeight: '600',
              padding: '8px 14px', borderRadius: '8px',
              background: enviandoLCR ? '#B4B2A9' : '#1A6B47',
              color: 'white', border: 'none',
              cursor: enviandoLCR ? 'not-allowed' : 'pointer',
            }}
          >
            {enviandoLCR ? 'Procesando...' : 'Confirmar reenvio de contrato'}
          </button>
        </>
      )}

      {/* ── MODO LEGAL: Reenviar vencido + nueva fecha (VENCIDO + REENVIAR_VENCIDO) ── */}
      {mostrarLegalVencido && (
        <>
          <div style={{ borderTop: '1px solid #2A7A50', margin: '10px 0' }} />
          <p style={{ fontSize: '10px', fontWeight: '600', color: '#4DC987', letterSpacing: '0.06em', marginBottom: '8px' }}>
            {'ACCION LEGAL · Nueva fecha de vencimiento'}
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="date"
              value={nuevaFechaLegal}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setNuevaFechaLegal(e.target.value)}
              style={{
                flex: 1, fontSize: '11px', padding: '7px 10px',
                border: '0.5px solid #2A7A50', borderRadius: '8px',
                background: '#0A1F12', color: 'white', outline: 'none',
              }}
            />
            <button
              onClick={handleLegalReenviarVencido}
              disabled={!nuevaFechaLegal || enviandoLRV}
              style={{
                fontSize: '11px', fontWeight: '600', padding: '7px 14px',
                borderRadius: '8px',
                background: !nuevaFechaLegal || enviandoLRV ? '#B4B2A9' : '#1A6B47',
                color: 'white', border: 'none',
                cursor: !nuevaFechaLegal || enviandoLRV ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {enviandoLRV ? '...' : 'Reenviar'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

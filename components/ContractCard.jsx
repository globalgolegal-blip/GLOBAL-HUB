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

export default function ContractCard({ contrato, numero, onSolicitarValidacion, acAutenticado, onSolicitarReenvio }) {
  const [enviando,        setEnviando]        = useState(false)
  const [enviandoReenvio, setEnviandoReenvio] = useState(false)

  const estado            = contrato._estado || 'INGRESADO'
  const cfg               = ESTADO_CONFIG[estado] || ESTADO_CONFIG['INGRESADO']
  const esObservado       = estado === 'CONTRATO_OBSERVADO'
  const intentos          = extraerIntentos(contrato)
  const reenvioSolicitado = String(contrato['SOLICITUD'] || '').toUpperCase().startsWith('REENVIAR')

  const venceHoy       = (estado === 'PENDIENTE' || estado === 'SOLICITADO')
                     && isHoy(contrato['FECHA DE VENCIMIENTO'])
  const clienteSinFirmar = estado === 'PENDIENTE'
                        && String(contrato['CONTRATO FIRMADO CONFORME'] || '').trim().toUpperCase() === 'PENDIENTE'

  async function handleSolicitar() {
    if (enviando) return
    setEnviando(true)
    try {
      await onSolicitarValidacion(contrato['ID'])
    } finally {
      setEnviando(false)
    }
  }

  async function handleReenvio() {
    if (enviandoReenvio) return
    setEnviandoReenvio(true)
    try {
      await onSolicitarReenvio(contrato['ID'])
    } finally {
      setEnviandoReenvio(false)
    }
  }

  const mostrarBloqueReenvio = estado === 'OBSERVADO' && (reenvioSolicitado || acAutenticado)

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
          margin: '0 0 8px',
          padding: '5px 10px',
          borderRadius: '6px',
          background: '#FCEBEB',
          border: '0.5px solid #F09595',
          fontSize: '11px',
          fontWeight: '600',
          color: '#A32D2D',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
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

      {/* Bloque solicitud — PENDIENTE y SOLICITADO */}
      {(estado === 'PENDIENTE' || estado === 'SOLICITADO') && (
        <>
          <div style={{ borderTop: '0.5px solid #D3D1C7', margin: '10px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            {estado === 'SOLICITADO' ? (
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
            <p style={{
              margin: '8px 0 0',
              fontSize: '10px',
              color: '#888780',
              fontStyle: 'italic',
            }}>
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
    </div>
  )
}

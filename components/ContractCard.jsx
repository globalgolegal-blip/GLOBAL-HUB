'use client'
import { ESTADO_CONFIG } from '../lib/utils'

function fmt(val) {
  if (!val) return '—'
  const s = String(val).trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s
  const d = new Date(s)
  if (isNaN(d)) return s
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

export default function ContractCard({ contrato, numero }) {
  const estado = contrato._estado || 'INGRESADO'
  const cfg    = ESTADO_CONFIG[estado] || ESTADO_CONFIG['INGRESADO']
  const esObservado = estado === 'CONTRATO_OBSERVADO'

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      borderLeft: `4px solid ${cfg.borderCard}`,
      border: `0.5px solid #D3D1C7`,
      borderLeftWidth: '4px',
      borderLeftColor: cfg.borderCard,
      padding: '12px 14px',
    }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
          {numero != null && (
            <span style={{
              flexShrink: 0,
              width: '22px', height: '22px',
              borderRadius: '50%',
              background: '#1A2238',
              color: 'white',
              fontSize: '10px',
              fontWeight: '500',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: '1px',
            }}>
              {numero}
            </span>
          )}
          <div style={{ fontWeight: '500', color: '#1A2238', fontSize: '13px', lineHeight: '1.3', textTransform: 'uppercase' }}>
            {contrato['CLIENTE'] || '—'}
          </div>
        </div>
        <span style={{
          flexShrink: 0,
          fontSize: '10px',
          fontWeight: '500',
          padding: '3px 8px',
          borderRadius: '20px',
          background: cfg.bgBadge,
          color: cfg.colorText,
          border: `0.5px solid ${cfg.borderBadge}`,
          whiteSpace: 'nowrap',
        }}>
          {cfg.labelCorto}
        </span>
      </div>

      {/* Datos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
        <div style={{ fontSize: '11px' }}>
          <span style={{ color: '#5F5E5A', fontWeight: '500' }}>DOI: </span>
          <span style={{ color: '#444441' }}>{contrato['DOI'] || '—'}</span>
        </div>
        <div style={{ fontSize: '11px' }}>
          <span style={{ color: '#5F5E5A', fontWeight: '500' }}>Ciudad: </span>
          <span style={{ color: '#444441' }}>{contrato['CIUDAD'] || '—'}</span>
        </div>
        <div style={{ fontSize: '11px', gridColumn: 'span 2' }}>
          <span style={{ color: '#5F5E5A', fontWeight: '500' }}>Dealer: </span>
          <span style={{ color: '#444441' }}>{contrato['DISTRIBUIDOR'] || '—'}</span>
        </div>
        <div style={{ fontSize: '11px' }}>
          <span style={{ color: '#5F5E5A', fontWeight: '500' }}>Celular: </span>
          <span style={{ color: '#444441' }}>{contrato['CELULAR DEL CLIENTE'] || contrato['CELULAR'] || '—'}</span>
        </div>
        <div style={{ fontSize: '11px' }}></div>
        <div style={{ fontSize: '11px' }}>
          <span style={{ color: '#5F5E5A', fontWeight: '500' }}>Enviado: </span>
          <span style={{ color: '#444441' }}>{esObservado ? 'OBSERVADO' : fmt(contrato['FECHA DE ENVÍO'])}</span>
        </div>
        <div style={{ fontSize: '11px' }}>
          <span style={{ color: estado === 'VENCIDO' ? '#A32D2D' : '#5F5E5A', fontWeight: '500' }}>Vence: </span>
          <span style={{ color: estado === 'VENCIDO' ? '#A32D2D' : '#444441', fontWeight: estado === 'VENCIDO' ? '500' : '400' }}>
            {esObservado ? 'OBSERVADO' : fmt(contrato['FECHA DE VENCIMIENTO'])}
          </span>
        </div>
      </div>
    </div>
  )
}

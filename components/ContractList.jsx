'use client'
import ContractCard from './ContractCard'

const ORDEN = { VENCIDO: 0, OBSERVADO: 1, CONTRATO_OBSERVADO: 2, SOLICITADO: 2, PENDIENTE: 3, VALIDADO: 4, INGRESADO: 5 }

export default function ContractList({ contratos, onSolicitarValidacion }) {
  const sorted = [...contratos].sort((a, b) => (ORDEN[a._estado] ?? 9) - (ORDEN[b._estado] ?? 9))

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: '#888780' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
        <div style={{ fontSize: '13px' }}>No hay contratos con este filtro</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sorted.map((c, i) => (
        <ContractCard
          key={c['ID'] || c['Nº'] || i}
          contrato={c}
          numero={i + 1}
          onSolicitarValidacion={onSolicitarValidacion}
        />
      ))}
    </div>
  )
}

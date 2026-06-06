'use client'
import ContractCard from './ContractCard'

const ORDEN = {
  VENCIDO:            0,
  OBSERVADO:          1,
  CONTRATO_OBSERVADO: 2,
  SOLICITADO:         2,
  PENDIENTE:          3,
  VALIDADO:           4,
  INGRESADO:          5,
}

export default function ContractList({ contratos, onSolicitarValidacion, acAutenticado, onSolicitarReenvio }) {
  const sorted = [...contratos].sort((a, b) => (ORDEN[a._estado] ?? 9) - (ORDEN[b._estado] ?? 9))

  return (
    <div className="space-y-2">
      {sorted.map((c, i) => (
        <ContractCard
          key={c['ID'] || c['Nº'] || i}
          contrato={c}
          numero={i + 1}
          onSolicitarValidacion={onSolicitarValidacion}
          acAutenticado={acAutenticado}
          onSolicitarReenvio={onSolicitarReenvio}
        />
      ))}
    </div>
  )
}

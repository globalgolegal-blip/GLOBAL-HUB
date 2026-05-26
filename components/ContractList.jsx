'use client'
import ContractCard from './ContractCard'

const ORDEN = { VENCIDO: 0, OBSERVADO: 1, CONTRATO_OBSERVADO: 2, PENDIENTE: 3, VALIDADO: 4, INGRESADO: 5 }

export default function ContractList({ contratos, categoriaLabel, plazoLabel, regionLabel }) {
  const sorted = [...contratos].sort((a, b) => (ORDEN[a._estado] ?? 9) - (ORDEN[b._estado] ?? 9))

  const partes = [
    categoriaLabel?.toUpperCase(),
    plazoLabel,
    regionLabel && regionLabel !== 'TODAS' ? regionLabel.toUpperCase() : null,
    `${contratos.length}`,
  ].filter(Boolean)

  return (
    <div className="space-y-2">
      <p style={{ fontSize: '11px', color: '#5F5E5A', letterSpacing: '0.04em', fontWeight: '500', paddingLeft: '2px' }}>
        {partes.join(' · ')}
      </p>

      {sorted.length === 0 ? (
        <div className="text-center py-12" style={{ color: '#888780' }}>
          <div className="text-4xl mb-2">📋</div>
          <div className="text-sm">No hay contratos con este filtro</div>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((c, i) => (
            <ContractCard key={c['ID'] || c['Nº'] || i} contrato={c} numero={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

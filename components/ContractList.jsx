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

export default function ContractList({
  contratos, onSolicitarValidacion, acAutenticado,
  onSolicitarReenvio, onSolicitarReenvioVencido,
  legalAutenticado, onLegalValidar, onLegalObservar,
  onLegalMarcarPendiente, onLegalConfirmarReenvio, onLegalReenviarVencido,
}) {
  const sorted = [...contratos].sort((a, b) => {
    // Primero por prioridad de estado
    const oa = ORDEN[a._estado] ?? 9
    const ob = ORDEN[b._estado] ?? 9
    if (oa !== ob) return oa - ob
    // Desempate: FECHA SOLICITUD más antigua primero (espera más tiempo = prioridad mayor)
    // Formato yyyy/MM/dd HH:mm permite comparación lexicográfica directa
    const fa = a['FECHA SOLICITUD'] || ''
    const fb = b['FECHA SOLICITUD'] || ''
    if (fa && fb) return fa < fb ? -1 : fa > fb ? 1 : 0
    if (fa) return -1  // tiene timestamp = solicitado = va antes
    if (fb) return 1
    return 0
  })
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
          onSolicitarReenvioVencido={onSolicitarReenvioVencido}
          legalAutenticado={legalAutenticado}
          onLegalValidar={onLegalValidar}
          onLegalObservar={onLegalObservar}
          onLegalMarcarPendiente={onLegalMarcarPendiente}
          onLegalConfirmarReenvio={onLegalConfirmarReenvio}
          onLegalReenviarVencido={onLegalReenviarVencido}
        />
      ))}
    </div>
  )
}

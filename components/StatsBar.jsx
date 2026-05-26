'use client'
// Resumen de contratos por estado

export default function StatsBar({ contratos }) {
  const counts = contratos.reduce((acc, c) => {
    acc[c._estado] = (acc[c._estado] || 0) + 1
    return acc
  }, {})

  const stats = [
    { label: 'Por firmar',         key: 'PENDIENTE',          bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    { label: 'Cto. observado',     key: 'CONTRATO_OBSERVADO', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    { label: 'Firma observada',    key: 'OBSERVADO',          bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    { label: 'Vencidos',           key: 'VENCIDO',            bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'    },
    { label: 'Validados',          key: 'VALIDADO',           bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {stats.map(s => (
        <div key={s.key} className={`flex-shrink-0 rounded-xl border ${s.bg} ${s.border} px-3 py-2 text-center min-w-[72px]`}>
          <div className={`text-xl font-bold ${s.text}`}>{counts[s.key] || 0}</div>
          <div className={`text-xs ${s.text} leading-tight`}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

'use client'
// Tarjeta de progreso hacia la meta mensual de créditos

export default function MetaCard({ meta, totalValidados }) {
  if (!meta || !meta.valor) return null

  const previos = meta.creditosPrevios || 0
  const totalReal = totalValidados + previos
  const porcentaje = Math.min(Math.round((totalReal / meta.valor) * 100), 100)
  const faltan = Math.max(meta.valor - totalReal, 0)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{meta.etiqueta}</span>
        <span className="text-xs font-bold text-gray-700">{porcentaje}%</span>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
        <div
          className="h-3 rounded-full transition-all duration-500"
          style={{
            width: `${porcentaje}%`,
            background: porcentaje >= 80 ? '#16a34a' : porcentaje >= 50 ? '#2563eb' : '#1a2e4a'
          }}
        />
      </div>

      <div className="flex justify-between text-sm">
        <div className="text-center">
          <div className="font-bold text-2xl text-green-600">{totalReal.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Validados</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-2xl text-gray-800">{meta.valor.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Meta</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-2xl text-blue-700">{faltan.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Faltan</div>
        </div>
      </div>
    </div>
  )
}

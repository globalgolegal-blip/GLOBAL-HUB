'use client'
import { REGIONES } from '../lib/regions'

// Selector jerárquico: Región → Departamento
export default function RegionFilter({ regionActiva, deptoActivo, onRegion, onDepto }) {
  const regiones = Object.keys(REGIONES)

  return (
    <div className="space-y-2">
      {/* Botones de región */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { onRegion(null); onDepto(null) }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            !regionActiva
              ? 'bg-[#1a2e4a] text-white border-[#1a2e4a]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a2e4a]'
          }`}
        >
          Todas
        </button>
        {regiones.map(region => (
          <button
            key={region}
            onClick={() => { onRegion(region); onDepto(null) }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              regionActiva === region
                ? 'bg-[#1a2e4a] text-white border-[#1a2e4a]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a2e4a]'
            }`}
          >
            {region}
          </button>
        ))}
      </div>

      {/* Departamentos de la región seleccionada */}
      {regionActiva && REGIONES[regionActiva] && (
        <div className="flex flex-wrap gap-1.5 pt-1 pl-1 border-l-2 border-[#1a2e4a]">
          <button
            onClick={() => onDepto(null)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
              !deptoActivo
                ? 'bg-[#1a2e4a] text-white border-[#1a2e4a]'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            Toda la región
          </button>
          {Object.keys(REGIONES[regionActiva]).map(depto => (
            <button
              key={depto}
              onClick={() => onDepto(depto)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                deptoActivo === depto
                  ? 'bg-[#1a2e4a] text-white border-[#1a2e4a]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {depto}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

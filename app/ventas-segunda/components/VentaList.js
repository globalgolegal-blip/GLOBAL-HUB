'use client'
// app/ventas-segunda/components/VentaList.js

import { derivarEstadoVS, ESTADO_CONFIG_VS } from '../../../lib/ventas-segunda/utils'
import VentaCard from './VentaCard'

export default function VentaList({ ventas, busqueda, rol, onActualizar }) {
  const query = busqueda.trim().toLowerCase()
  const filtradas = query
    ? ventas.filter(v =>
        v.PLACA?.toLowerCase().includes(query) ||
        v.NOMBRE?.toLowerCase().includes(query) ||
        v.DNI?.toLowerCase().includes(query))
    : ventas

  const sortPorEstado = (a, b) => {
    const ea = derivarEstadoVS(a)
    const eb = derivarEstadoVS(b)
    return (ESTADO_CONFIG_VS[ea]?.orden ?? 99) - (ESTADO_CONFIG_VS[eb]?.orden ?? 99)
  }

  // Si alguna venta tiene la flag _pendiente definida, estamos en modo rol
  const hayRol = filtradas.some(v => v._pendiente !== undefined)

  const pendientes = hayRol
    ? [...filtradas].filter(v => v._pendiente !== false).sort(sortPorEstado)
    : [...filtradas].sort(sortPorEstado)

  const resto = hayRol
    ? [...filtradas].filter(v => v._pendiente === false).sort(sortPorEstado)
    : []

  if (filtradas.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '40px 0',
        color: '#9CA3AF', fontSize: 14,
      }}>
        {query ? 'Sin resultados para esa búsqueda.' : 'No hay ventas de segunda registradas.'}
      </div>
    )
  }

  return (
    <div>
      {pendientes.map(v => (
        <VentaCard key={v._idx} venta={v} rol={rol} onActualizar={onActualizar} />
      ))}

      {hayRol && resto.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          margin: '16px 0 12px',
        }}>
          <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
          <span style={{
            fontSize: 11, fontWeight: 500, color: '#9CA3AF',
            whiteSpace: 'nowrap', letterSpacing: '0.04em',
          }}>
            Otros contratos
          </span>
          <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
        </div>
      )}

      {resto.map(v => (
        <VentaCard key={v._idx} venta={v} rol={rol} onActualizar={onActualizar} />
      ))}
    </div>
  )
}

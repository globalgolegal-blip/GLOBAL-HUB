'use client'
// app/components/VentaList.js
import { derivarEstadoVS, ESTADO_CONFIG_VS } from '../../../lib/ventas-segunda/utils'
import VentaCard from './VentaCard'

export default function VentaList({ ventas, busqueda, rol, onActualizar }) {
  const query = busqueda.trim().toLowerCase()
  const filtradas = query
    ? ventas.filter(v =>
        v.PLACA.toLowerCase().includes(query) ||
        v.NOMBRE.toLowerCase().includes(query) ||
        v.DNI.toLowerCase().includes(query))
    : ventas

  const ordenadas = [...filtradas].sort((a, b) => {
    const ea = derivarEstadoVS(a)
    const eb = derivarEstadoVS(b)
    return (ESTADO_CONFIG_VS[ea]?.orden ?? 99) - (ESTADO_CONFIG_VS[eb]?.orden ?? 99)
  })

  if (ordenadas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 14 }}>
        {query ? 'Sin resultados para esa búsqueda.' : 'No hay ventas de segunda registradas.'}
      </div>
    )
  }

  return (
    <div>
      {ordenadas.map(v => (
        <VentaCard key={v._idx} venta={v} rol={rol} onActualizar={onActualizar} />
      ))}
    </div>
  )
}

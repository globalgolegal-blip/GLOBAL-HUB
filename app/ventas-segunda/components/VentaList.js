'use client'
// app/ventas-segunda/components/VentaList.js

import { derivarEstadoVS, ESTADO_CONFIG_VS } from '../../../lib/ventas-segunda/utils'
import VentaCard from './VentaCard'

const normPlaca = (v) => String(v.PLACA || '').trim().toUpperCase()

export default function VentaList({ ventas, busqueda, rol, onActualizar }) {
  const query = busqueda.trim().toLowerCase()

  // B.6 — Excluir ANULADO de la vista (queda en sheet + historial para auditoría)
  const visibles = ventas.filter(v => derivarEstadoVS(v) !== 'ANULADO')

  // B.6 — Detección dinámica de placas duplicadas (2+ activos con la misma placa).
  // Cubre duplicados por formulario Y por edición manual del sheet.
  const conteoPlaca = {}
  visibles.forEach(v => {
    const p = normPlaca(v)
    if (p) conteoPlaca[p] = (conteoPlaca[p] || 0) + 1
  })
  const placasEnConflicto = new Set(
    Object.keys(conteoPlaca).filter(p => conteoPlaca[p] > 1)
  )
  const enConflicto = (v) => placasEnConflicto.has(normPlaca(v))

  const filtradas = query
    ? visibles.filter(v =>
        v.PLACA?.toLowerCase().includes(query) ||
        v.NOMBRE?.toLowerCase().includes(query) ||
        v.DNI?.toLowerCase().includes(query))
    : visibles

  const sortPorEstado = (a, b) => {
    const ea = derivarEstadoVS(a)
    const eb = derivarEstadoVS(b)
    return (ESTADO_CONFIG_VS[ea]?.orden ?? 99) - (ESTADO_CONFIG_VS[eb]?.orden ?? 99)
  }

  // Conflictos primero (agrupados por placa), luego el flujo normal
  const conflictivas = filtradas.filter(enConflicto)
    .sort((a, b) => normPlaca(a).localeCompare(normPlaca(b)))
  const restantes = filtradas.filter(v => !enConflicto(v))

  // Si alguna venta tiene la flag _pendiente definida, estamos en modo rol
  const hayRol = restantes.some(v => v._pendiente !== undefined)

  const pendientes = hayRol
    ? [...restantes].filter(v => v._pendiente !== false).sort(sortPorEstado)
    : [...restantes].sort(sortPorEstado)

  const resto = hayRol
    ? [...restantes].filter(v => v._pendiente === false).sort(sortPorEstado)
    : []

  if (filtradas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 14 }}>
        {query ? 'Sin resultados para esa búsqueda.' : 'No hay ventas de segunda registradas.'}
      </div>
    )
  }

  return (
    <div>
      {/* B.6 — Bloque de placas duplicadas en conflicto */}
      {conflictivas.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
            padding: '10px 12px', marginBottom: 8,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', marginBottom: 2 }}>
              {'⚠ Placas duplicadas — requieren decisión de Legal'}
            </div>
            <div style={{ fontSize: 11, color: '#991B1B', lineHeight: 1.4 }}>
              {'Hay '}{placasEnConflicto.size}{' placa'}{placasEnConflicto.size > 1 ? 's' : ''}
              {' con más de un expediente activo. Están bloqueadas para acciones hasta que '}
              {'Legal anule el expediente que corresponda.'}
            </div>
          </div>
          {conflictivas.map(v => (
            <VentaCard key={v._idx} venta={v} rol={rol} onActualizar={onActualizar} enConflicto />
          ))}
        </div>
      )}

      {pendientes.map(v => (
        <VentaCard key={v._idx} venta={v} rol={rol} onActualizar={onActualizar} />
      ))}

      {hayRol && resto.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 12px' }}>
          <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
            Otras solicitudes
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

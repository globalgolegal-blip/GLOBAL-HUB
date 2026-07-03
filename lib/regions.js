// Estructura jerárquica: REGIÓN → DEPARTAMENTO → CIUDADES
export const REGIONES = {
  'LIMA METROPOLITANA': {
    'Lima': ['Lima', 'Ate', 'Surquillo', 'Comas'],
  },
  'NORTE': {
    'Piura':      ['Piura', 'Sullana'],
    'Lambayeque': ['Monsefu', 'Chiclayo', 'Ferreñafe', 'Lambayeque'],
    'Cajamarca':  ['Bambamarca', 'Cajamarca', 'Baños del Inca', 'San Marcos', 'Cajabamba', 'Jaén'],
  },
  'SUR': {
    'Lima Provincia': ['San Vicente de Cañete', 'Cañete'],
    'Ica':            ['Ica', 'Chincha Alta', 'Chincha'],
    'Arequipa':       ['Arequipa'],
    'Cusco':          ['Cusco'],
  },
  'ORIENTE': {
    'San Martín':    ['Lamas', 'Tarapoto', 'Juanjui', 'Moyobamba'],
    'Ucayali':       ['Pucallpa', 'Aguaytia'],
    'Loreto':        ['Iquitos', 'Nauta'],
    'Madre de Dios': ['Puerto Maldonado'],
    'Amazonas':      ['Bagua Grande', 'Bagua'],
  },
  'CENTRO': {
    'La Libertad': ['Trujillo', 'Casa Grande', 'Laredo', 'Ascope','Chepen'],
    'Lima':        ['Huacho', 'Huaral', 'Lima Provincias'],
    'Ancash':      ['Chimbote', 'Huaraz'],
    'Huánuco':     ['Huanuco', 'Tingo Maria'],
    'Ayacucho':    ['Ayacucho'],
    'Junín':       ['Huancayo', 'Tarma', 'Jauja', 'La Merced'],
  },
}
// Devuelve la región a partir del departamento
export function getRegionDeDepto(depto) {
  if (!depto) return null
  const d = depto.trim().toUpperCase()
  for (const [region, deptos] of Object.entries(REGIONES)) {
    if (Object.keys(deptos).some(k => k.toUpperCase() === d)) return region
  }
  return null
}
// Devuelve el departamento a partir de una ciudad (fallback para datos sin columna DEPARTAMENTO)
export function getDeptoDeciudad(ciudad) {
  if (!ciudad) return null
  const c = ciudad.trim().toUpperCase()
  for (const deptos of Object.values(REGIONES)) {
    for (const [depto, ciudades] of Object.entries(deptos)) {
      if (ciudades.some(x => x.toUpperCase() === c || c.includes(x.toUpperCase()) || x.toUpperCase().includes(c))) {
        return depto
      }
    }
  }
  return null
}
// Devuelve la región a partir de una ciudad (compatibilidad con datos existentes)
export function getRegionDeCiudad(ciudad) {
  if (!ciudad) return null
  const c = ciudad.trim().toUpperCase()
  for (const [region, deptos] of Object.entries(REGIONES)) {
    for (const ciudades of Object.values(deptos)) {
      if (ciudades.some(x => x.toUpperCase() === c || c.includes(x.toUpperCase()) || x.toUpperCase().includes(c))) {
        return region
      }
    }
  }
  return 'OTRAS'
}
// Lista plana de todas las ciudades
export function todasLasCiudades() {
  return Object.values(REGIONES).flatMap(deptos => Object.values(deptos).flat())
}
// Departamentos de una región
export function deptosDeRegion(region) {
  return REGIONES[region] ? Object.keys(REGIONES[region]) : []
}
// Ciudades de un departamento dentro de una región
export function ciudadesDeDepto(region, depto) {
  return REGIONES[region]?.[depto] ?? []
}
// Todas las ciudades de una región (aplanado, sin pasar por departamento)
export function ciudadesDeRegion(region) {
  if (!region || !REGIONES[region]) return []
  return Object.values(REGIONES[region]).flat()
}

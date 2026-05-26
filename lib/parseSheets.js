// Parser del Google Sheet de Legal
// Estructura del sheet:
//   Fila 1: [vacío...] "META [MES]"  [número]  [vacío...]
//   Fila 2: Encabezados de columnas
//   Fila 3+: Datos de contratos

export function parsearSheet(filas) {
  if (!filas || filas.length < 2) return { meta: null, contratos: [] }

  // --- Meta mensual (Fila 1, columnas F y G = índices 5 y 6) ---
  // --- Créditos previos (Fila 1, B1 = índice 1 etiqueta, C1 = índice 2 valor) ---
  const fila1 = filas[0] || []
  let metaMes = null
  let metaValor = null
  let creditosPrevios = 0

  // Leer créditos previos desde B1/C1
  const etiqPrevios = String(fila1[1] || '').trim().toUpperCase()
  if (etiqPrevios === 'NUMERO INICIAL DE CREDITOS' || etiqPrevios === 'NUMERO INICIAL DE CRÉDITOS') {
    creditosPrevios = parseInt(String(fila1[2] || '0').replace(/[^0-9]/g, ''), 10) || 0
  }

  for (let i = 0; i < fila1.length - 1; i++) {
    const celda = String(fila1[i] || '').trim().toUpperCase()
    if (celda.startsWith('META')) {
      metaMes = String(fila1[i] || '').trim()
      metaValor = parseInt(String(fila1[i + 1] || '0').replace(/[^0-9]/g, ''), 10)
      break
    }
  }

  // --- Encabezados (Fila 2) ---
  const encabezados = (filas[1] || []).map(h => String(h || '').trim())

  // --- Datos (Fila 3 en adelante) ---
  const contratos = []
  for (let i = 2; i < filas.length; i++) {
    const fila = filas[i]
    if (!fila || fila.every(c => !c)) continue // saltar filas vacías

    const contrato = {}
    encabezados.forEach((enc, idx) => {
      if (enc) contrato[enc] = String(fila[idx] || '').trim()
    })

    // Solo incluir filas que tengan al menos un ID o nombre de cliente
    if (contrato['CLIENTE'] || contrato['ID'] || contrato['Nº']) {
      contratos.push(contrato)
    }
  }

  return { meta: { etiqueta: metaMes, valor: metaValor, creditosPrevios }, contratos }
}

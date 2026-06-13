// lib/ventas-segunda/parseSheets.js
// Parser para la hoja "Respuestas de formulario 1" del sheet de Ventas de Segunda.
// El Apps Script retorna un array de arrays (filas de datos, sin encabezados).
//
// Mapa de columnas (0-indexed):
//  0  Marca temporal
//  1  Placa del vehículo
//  2  Nombre del comprador
//  3  DNI/CE del comprador
//  4  Numero de telefono del comprador
//  5  Pago del Vehículo
//  6  Foto DNI Anverso (Drive URL)
//  7  Foto DNI Reverso (Drive URL)
//  8  Pago de Notariales, Registrales y Asociación
//  9  ESTADO               (col J — escritura manual opcional, GoTrack usa derivarEstadoVS)
// 10  FECHA CITA           (col K)
// 11  HORA CITA            (col L)
// 12  SIN CITA             (col M)
// 13  OBSERVACION DOCS     (col N)
// 14  GM SOLICITADA        (col O)
// 15  GM LEVANTADA         (col P)
// 16  FECHA FIRMA          (col Q)
// 17  FECHA INSCRIPCION    (col R)
// 18  OBSERVACIONES        (col S — historial libre)

export function parsearVentas(filas) {
  if (!filas || filas.length === 0) return []

  return filas
    .map((fila, idx) => ({
      _idx:              idx,                                    // nro de fila 0-based (para acciones Apps Script)
      MARCA_TEMPORAL:    String(fila[0]  || '').trim(),
      PLACA:             String(fila[1]  || '').trim().toUpperCase(),
      NOMBRE:            String(fila[2]  || '').trim(),
      DNI:               String(fila[3]  || '').trim(),
      TELEFONO:          String(fila[4]  || '').trim(),
      PAGO_VEHICULO:     String(fila[5]  || '').trim(),
      FOTO_DNI_ANV:      String(fila[6]  || '').trim(),
      FOTO_DNI_REV:      String(fila[7]  || '').trim(),
      PAGO_NOTARIALES:   String(fila[8]  || '').trim(),
      ESTADO_SHEET:      String(fila[9]  || '').trim(),
      FECHA_CITA:        String(fila[10] || '').trim(),
      HORA_CITA:         String(fila[11] || '').trim(),
      SIN_CITA:          String(fila[12] || '').trim(),
      OBSERVACION_DOCS:  String(fila[13] || '').trim(),
      GM_SOLICITADA:     String(fila[14] || '').trim(),
      GM_LEVANTADA:      String(fila[15] || '').trim(),
      FECHA_FIRMA:       String(fila[16] || '').trim(),
      FECHA_INSCRIPCION: String(fila[17] || '').trim(),
      OBSERVACIONES:     String(fila[18] || '').trim(),
    }))
    .filter(v => v.PLACA || v.NOMBRE)   // excluir filas completamente vacías
}

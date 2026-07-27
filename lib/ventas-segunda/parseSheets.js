// lib/ventas-segunda/parseSheets.js
// Parser para "Respuestas de formulario 1". 31 columnas (A–AE).
// 0-indexed:
//  0 Marca temporal 1 Placa 2 Nombre 3 DNI 4 Teléfono 5 Pago Vehículo
//  6 Foto DNI Anv 7 Foto DNI Rev 8 Pago Notariales
//  9 SOCIEDAD_CONYUGAL 10 NOMBRE_CONYUGE 11 DNI_CONYUGE 12 FOTO_CONYUGE_ANV 13 FOTO_CONYUGE_REV
// 14 PRECIO_ACORDADO (O)  15 CIUDAD (P)  16 TIVE_URL (Q)  17 SOAT_URL (R)
// 18 ESTADO_SHEET (S) 19 FECHA_CITA (T) 20 HORA_CITA (U) 21 SIN_CITA (V)
// 22 OBSERVACION_DOCS (W) 23 GM_SOLICITADA (X) 24 GM_LEVANTADA (Y)
// 25 FECHA_FIRMA (Z) 26 FECHA_INSCRIPCION (AA)
// 27 OBSERVACIONES (AB — no se expone) 28 BOLETA_URL (AC) 29 SUBSANACION_URL (AD)
// 30 OBSERVACION_CONTENIDO (AE)
export function parsearVentas(filas) {
  if (!filas || filas.length === 0) return []
  return filas
    .map((fila, idx) => ({
      _idx:                 idx,
      MARCA_TEMPORAL:       String(fila[0]  || '').trim(),
      PLACA:                String(fila[1]  || '').trim().toUpperCase(),
      NOMBRE:               String(fila[2]  || '').trim(),
      DNI:                  String(fila[3]  || '').trim(),
      TELEFONO:             String(fila[4]  || '').trim(),
      PAGO_VEHICULO:        String(fila[5]  || '').trim(),
      FOTO_DNI_ANV:         String(fila[6]  || '').trim(),
      FOTO_DNI_REV:         String(fila[7]  || '').trim(),
      PAGO_NOTARIALES:      String(fila[8]  || '').trim(),
      SOCIEDAD_CONYUGAL:    String(fila[9]  || '').trim(),
      NOMBRE_CONYUGE:       String(fila[10] || '').trim(),
      DNI_CONYUGE:          String(fila[11] || '').trim(),
      FOTO_DNI_CONYUGE_ANV: String(fila[12] || '').trim(),
      FOTO_DNI_CONYUGE_REV: String(fila[13] || '').trim(),
      PRECIO_ACORDADO:      String(fila[14] || '').trim(),
      CIUDAD:               String(fila[15] || '').trim(),
      TIVE_URL:             String(fila[16] || '').trim(),
      SOAT_URL:             String(fila[17] || '').trim(),
      ESTADO_SHEET:         String(fila[18] || '').trim(),
      FECHA_CITA:           String(fila[19] || '').trim(),
      HORA_CITA:            String(fila[20] || '').trim(),
      SIN_CITA:             String(fila[21] || '').trim(),
      OBSERVACION_DOCS:     String(fila[22] || '').trim(),
      GM_SOLICITADA:        String(fila[23] || '').trim(),
      GM_LEVANTADA:         String(fila[24] || '').trim(),
      FECHA_FIRMA:          String(fila[25] || '').trim(),
      FECHA_INSCRIPCION:    String(fila[26] || '').trim(),
      // OBSERVACIONES (fila[27]) queda en el sheet — no se expone
      BOLETA_URL:              String(fila[28] || '').trim(),
      SUBSANACION_URL:         String(fila[29] || '').trim(),
      OBSERVACION_CONTENIDO:   String(fila[30] || '').trim(),
    }))
    .filter(v => v.PLACA || v.NOMBRE)
}

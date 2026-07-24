// lib/ventas-segunda/parseSheets.js
// Parser para "Respuestas de formulario 1". 30 columnas (A–AD).
// 0-indexed:
//  0 Marca temporal 1 Placa 2 Nombre 3 DNI 4 Teléfono 5 Pago Vehículo
//  6 Foto DNI Anv 7 Foto DNI Rev 8 Pago Notariales
//  9 SOCIEDAD_CONYUGAL 10 NOMBRE_CONYUGE 11 DNI_CONYUGE 12 FOTO_CONYUGE_ANV 13 FOTO_CONYUGE_REV
// 14 PRECIO_ACORDADO (O)  15 CIUDAD (P)  16 TIVE_URL (Q)
// 17 ESTADO_SHEET (R) 18 FECHA_CITA (S) 19 HORA_CITA (T) 20 SIN_CITA (U)
// 21 OBSERVACION_DOCS (V) 22 GM_SOLICITADA (W) 23 GM_LEVANTADA (X)
// 24 FECHA_FIRMA (Y) 25 FECHA_INSCRIPCION (Z)
// 26 OBSERVACIONES (AA — no se expone) 27 BOLETA_URL (AB) 28 SUBSANACION_URL (AC)
// 29 OBSERVACION_CONTENIDO (AD)
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
      ESTADO_SHEET:         String(fila[17] || '').trim(),
      FECHA_CITA:           String(fila[18] || '').trim(),
      HORA_CITA:            String(fila[19] || '').trim(),
      SIN_CITA:             String(fila[20] || '').trim(),
      OBSERVACION_DOCS:     String(fila[21] || '').trim(),
      GM_SOLICITADA:        String(fila[22] || '').trim(),
      GM_LEVANTADA:         String(fila[23] || '').trim(),
      FECHA_FIRMA:          String(fila[24] || '').trim(),
      FECHA_INSCRIPCION:    String(fila[25] || '').trim(),
      // OBSERVACIONES (fila[26]) queda en el sheet — no se expone
      BOLETA_URL:              String(fila[27] || '').trim(),
      SUBSANACION_URL:         String(fila[28] || '').trim(),
      OBSERVACION_CONTENIDO:   String(fila[29] || '').trim(),
    }))
    .filter(v => v.PLACA || v.NOMBRE)
}

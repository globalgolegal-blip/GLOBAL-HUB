// lib/ventas-segunda/parseSheets.js
// Parser para la hoja "Respuestas de formulario 1" del sheet de Ventas de Segunda.
// El Apps Script retorna un array de arrays (filas de datos, sin encabezados).
//
// Mapa de columnas (0-indexed) — 25 columnas totales (A–Y):
//  0  Marca temporal
//  1  Placa del vehículo
//  2  Nombre del comprador
//  3  DNI/CE del comprador
//  4  Numero de telefono del comprador
//  5  Pago del Vehículo
//  6  Foto DNI Anverso (Drive URL)
//  7  Foto DNI Reverso (Drive URL)
//  8  Pago de Notariales, Registrales y Asociación
//  ── Sociedad Conyugal (form, cols J–N) ──────────────────────
//  9  SOCIEDAD_CONYUGAL    (J — "Sí" / "No" — "¿El comprador está casado?")
// 10  NOMBRE_CONYUGE       (K)
// 11  DNI_CONYUGE          (L)
// 12  FOTO_DNI_CONYUGE_ANV (M — Drive URL)
// 13  FOTO_DNI_CONYUGE_REV (N — Drive URL)
//  ── Columnas manuales GoTrack (cols O–X) ─────────────────────
// 14  ESTADO_SHEET         (O)
// 15  FECHA_CITA           (P)
// 16  HORA_CITA            (Q)
// 17  SIN_CITA             (R)
// 18  OBSERVACION_DOCS     (S)
// 19  GM_SOLICITADA        (T)
// 20  GM_LEVANTADA         (U)
// 21  FECHA_FIRMA          (V)
// 22  FECHA_INSCRIPCION    (W)
// 23  OBSERVACIONES        (X — historial interno, solo visible en el sheet)
// 24  BOLETA_URL           (Y — URL Drive de la boleta subida por Tesorería)

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
      // ── Sociedad Conyugal ──────────────────────────────────────
      SOCIEDAD_CONYUGAL:    String(fila[9]  || '').trim(),
      NOMBRE_CONYUGE:       String(fila[10] || '').trim(),
      DNI_CONYUGE:          String(fila[11] || '').trim(),
      FOTO_DNI_CONYUGE_ANV: String(fila[12] || '').trim(),
      FOTO_DNI_CONYUGE_REV: String(fila[13] || '').trim(),
      // ── GoTrack ───────────────────────────────────────────────
      ESTADO_SHEET:         String(fila[14] || '').trim(),
      FECHA_CITA:           String(fila[15] || '').trim(),
      HORA_CITA:            String(fila[16] || '').trim(),
      SIN_CITA:             String(fila[17] || '').trim(),
      OBSERVACION_DOCS:     String(fila[18] || '').trim(),
      GM_SOLICITADA:        String(fila[19] || '').trim(),
      GM_LEVANTADA:         String(fila[20] || '').trim(),
      FECHA_FIRMA:          String(fila[21] || '').trim(),
      FECHA_INSCRIPCION:    String(fila[22] || '').trim(),
      // OBSERVACIONES (fila[23]) queda en el sheet — no se expone al card
      BOLETA_URL:           String(fila[24] || '').trim(),
    }))
    .filter(v => v.PLACA || v.NOMBRE)
}

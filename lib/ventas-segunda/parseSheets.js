// lib/ventas-segunda/parseSheets.js
// Parser para la hoja "Respuestas de formulario 1" del sheet de Ventas de Segunda.
// El Apps Script retorna un array de arrays (filas de datos, sin encabezados).
//
// Mapa de columnas (0-indexed) — 29 columnas totales (A–AC):
//  0  Marca temporal          1  Placa            2  Nombre         3  DNI/CE
//  4  Teléfono                5  Pago Vehículo     6  Foto DNI Anv   7  Foto DNI Rev
//  8  Pago Notariales
//  ── Sociedad Conyugal (J–N) ──
//  9  SOCIEDAD_CONYUGAL   10 NOMBRE_CONYUGE   11 DNI_CONYUGE
// 12  FOTO_DNI_CONYUGE_ANV  13 FOTO_DNI_CONYUGE_REV
// 14  PRECIO_ACORDADO (O)
// 15  CIUDAD (P)  ← NUEVO
//  ── Columnas manuales GoTrack (Q–AC, +1 respecto de la versión anterior) ──
// 16  ESTADO_SHEET (Q)     17 FECHA_CITA (R)      18 HORA_CITA (S)    19 SIN_CITA (T)
// 20  OBSERVACION_DOCS (U) 21 GM_SOLICITADA (V)   22 GM_LEVANTADA (W)
// 23  FECHA_FIRMA (X)      24 FECHA_INSCRIPCION (Y)
// 25  OBSERVACIONES (Z — historial interno, no se expone)
// 26  BOLETA_URL (AA)      27 SUBSANACION_URL (AB) 28 OBSERVACION_CONTENIDO (AC)
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
      // ── Nueva pregunta de formulario ──────────────────────────
      PRECIO_ACORDADO:      String(fila[14] || '').trim(),
      // ── Ciudad (nueva pregunta P) ─────────────────────────────
      CIUDAD:               String(fila[15] || '').trim(),
      // ── GoTrack (corridas +1) ─────────────────────────────────
      ESTADO_SHEET:         String(fila[16] || '').trim(),
      FECHA_CITA:           String(fila[17] || '').trim(),
      HORA_CITA:            String(fila[18] || '').trim(),
      SIN_CITA:             String(fila[19] || '').trim(),
      OBSERVACION_DOCS:     String(fila[20] || '').trim(),
      GM_SOLICITADA:        String(fila[21] || '').trim(),
      GM_LEVANTADA:         String(fila[22] || '').trim(),
      FECHA_FIRMA:          String(fila[23] || '').trim(),
      FECHA_INSCRIPCION:    String(fila[24] || '').trim(),
      // OBSERVACIONES (fila[25]) queda en el sheet — no se expone al card
      BOLETA_URL:              String(fila[26] || '').trim(),
      SUBSANACION_URL:         String(fila[27] || '').trim(),
      OBSERVACION_CONTENIDO:   String(fila[28] || '').trim(),
    }))
    .filter(v => v.PLACA || v.NOMBRE)
}

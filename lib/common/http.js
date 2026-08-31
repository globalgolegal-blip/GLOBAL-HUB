// lib/common/http.js — Cliente HTTP compartido por todas las caras de GoTrack
// (Desembolso, Ventas de Segunda y, a futuro, Levantamiento).
//
// Reintenta ante fallos transitorios —típicamente el 404/5xx que devuelve el
// web app de Apps Script mientras "despierta" de un arranque en frío— antes de
// darlo por caído. Así una sola implementación cubre a todas las caras y el
// usuario deja de ver esos errores pasajeros.

const ESPERAS_DEFAULT = [500, 1500, 3000] // 3 reintentos: 0.5s, 1.5s, 3s

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Trae una URL y devuelve su JSON, con reintentos ante fallos transitorios.
 *
 * @param {string} url                 URL a consultar.
 * @param {object} [opts]
 * @param {number[]} [opts.esperas]    Esperas entre reintentos, en ms. Su
 *                                     longitud define cuántos reintentos hay.
 * @param {object} [opts.fetchOpts]    Opciones extra para fetch (headers, etc.).
 * @returns {Promise<any>}             El JSON de la respuesta.
 * @throws                            El último error si agota los intentos.
 */
export async function cargarJSON(url, { esperas = ESPERAS_DEFAULT, fetchOpts = {} } = {}) {
  let ultimoError
  for (let intento = 0; intento <= esperas.length; intento++) {
    try {
      const res = await fetch(url, { cache: 'no-store', ...fetchOpts })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // Convención del backend: un objeto con `error` es un fallo del servidor.
      if (data && data.error) throw new Error(data.error)
      return data
    } catch (err) {
      ultimoError = err
      if (intento < esperas.length) await espera(esperas[intento])
    }
  }
  throw ultimoError
}

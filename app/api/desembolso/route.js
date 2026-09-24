// app/api/desembolso/route.js — Proxy con CACHÉ EN MEMORIA + REINTENTO (Desembolso).
// Caché controlada por nosotros (no depende del Data Cache de Next, que con
// force-dynamic a veces no entra). Sirve las cargas repetidas al instante desde
// memoria; las acciones van directas y limpian la caché.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SCRIPT_URL = process.env.DESEMBOLSO_SCRIPT_URL
  || 'https://script.google.com/macros/s/AKfycbxE8kT5hBbav2OT-kiCSj3jz2xg_XW2v0y3DkUwHRBTAaaI0AgPTVHpbzL-_rHI9hhNHw/exec'

const TTL_MS = 15000                     // 15 s de caché para la carga de datos
const BACKOFFS = [0, 800, 2000, 4000]    // reintentos ante 404/5xx (cold start)
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

let cacheDatos = null                    // { body, contentType, at } por instancia

function reenviar(texto, status, contentType, extra) {
  return new NextResponse(texto, {
    status,
    headers: { 'Content-Type': contentType || 'application/json; charset=utf-8', ...(extra || {}) },
  })
}

async function fetchConReintentos(url, opts) {
  let ultimoError
  for (let i = 0; i < BACKOFFS.length; i++) {
    if (BACKOFFS[i]) await espera(BACKOFFS[i])
    try {
      const r = await fetch(url, opts)
      if (r.status === 404 || r.status >= 500) { ultimoError = new Error('status ' + r.status); continue }
      return r
    } catch (e) { ultimoError = e }
  }
  throw ultimoError
}

export async function GET(req) {
  const params = new URLSearchParams(req.nextUrl.searchParams)
  params.delete('_t')
  const esAccion = params.has('accion')
  const destino = SCRIPT_URL + (params.toString() ? '?' + params.toString() : '')

  // ── ACCIONES: directo, sin caché; al terminar limpia la caché ──────────────
  if (esAccion) {
    try {
      const r = await fetchConReintentos(destino, { cache: 'no-store', redirect: 'follow' })
      const texto = await r.text()
      cacheDatos = null                  // la próxima carga trae el cambio
      return reenviar(texto, r.status, r.headers.get('content-type'))
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'No se pudo procesar la acción. Intenta de nuevo.' }, { status: 502 })
    }
  }

  // ── CARGA DE DATOS: caché en memoria (instantánea si está fresca) ──────────
  if (cacheDatos && (Date.now() - cacheDatos.at) < TTL_MS) {
    return reenviar(cacheDatos.body, 200, cacheDatos.contentType, { 'X-Cache': 'HIT' })
  }
  try {
    const r = await fetchConReintentos(destino, { cache: 'no-store', redirect: 'follow' })
    const texto = await r.text()
    if (r.status === 200) cacheDatos = { body: texto, contentType: r.headers.get('content-type'), at: Date.now() }
    return reenviar(texto, r.status, r.headers.get('content-type'), { 'X-Cache': 'MISS' })
  } catch (e) {
    if (cacheDatos) return reenviar(cacheDatos.body, 200, cacheDatos.contentType, { 'X-Cache': 'STALE' })
    return NextResponse.json({ error: 'El servicio no respondió. Intenta de nuevo en un momento.' }, { status: 502 })
  }
}

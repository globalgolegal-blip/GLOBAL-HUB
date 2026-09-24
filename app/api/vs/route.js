// app/api/vs/route.js — Proxy con CACHÉ EN MEMORIA + REINTENTO (Ventas de Segunda).
// Caché controlada por nosotros (no depende del Data Cache de Next). Sirve las
// cargas repetidas al instante; acciones y POST van directos y limpian la caché
// (salvo las de solo-lectura, que no la limpian).
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SCRIPT_URL = process.env.VS_SCRIPT_URL
  || 'https://script.google.com/macros/s/AKfycbz-oivbhGf_nDcuDK85ImtyPws-R8QwuKH_vd2TqYmYRQkYos5y3GdVSzPQZoFu3JQFNw/exec'

const TTL_MS = 15000
const BACKOFFS = [0, 800, 2000, 4000]
const ACCIONES_LECTURA = ['get_ciudades', 'get_gm_table', 'login']  // no limpian la caché
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

let cacheDatos = null

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
  const action = params.get('action') || ''
  const esAccion = !!action
  const destino = SCRIPT_URL + (params.toString() ? '?' + params.toString() : '')

  if (esAccion) {
    try {
      const r = await fetchConReintentos(destino, { cache: 'no-store', redirect: 'follow' })
      const texto = await r.text()
      if (ACCIONES_LECTURA.indexOf(action) === -1) cacheDatos = null   // solo las que modifican limpian
      return reenviar(texto, r.status, r.headers.get('content-type'))
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'No se pudo procesar la solicitud. Intenta de nuevo.' }, { status: 502 })
    }
  }

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
    return NextResponse.json({ ok: false, error: 'El servicio no respondió. Intenta de nuevo en un momento.' }, { status: 502 })
  }
}

export async function POST(req) {
  let cuerpo
  try { cuerpo = await req.text() } catch { return NextResponse.json({ ok: false, error: 'Petición mal formada' }, { status: 400 }) }
  try {
    const r = await fetchConReintentos(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: cuerpo,
      redirect: 'follow',
      cache: 'no-store',
    })
    const texto = await r.text()
    cacheDatos = null
    return reenviar(texto, r.status, r.headers.get('content-type'))
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'No se pudo subir el archivo. Intenta de nuevo.' }, { status: 502 })
  }
}

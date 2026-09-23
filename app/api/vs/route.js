// app/api/vs/route.js — Puente (BFF) con CACHÉ + REINTENTO para Ventas de Segunda.
//
// Despliega SOLO con commit a GitHub (Vercel construye solo). No requiere variable
// de entorno ni tocar el panel de Vercel: la URL vive aquí, en el SERVIDOR, y este
// archivo NUNCA se envía al navegador, así que la URL no queda expuesta.
import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

// URL /exec del Apps Script de VS. Si defines VS_SCRIPT_URL en Vercel, esa manda.
const SCRIPT_URL = process.env.VS_SCRIPT_URL
  || 'https://script.google.com/macros/s/AKfycbz-oivbhGf_nDcuDK85ImtyPws-R8QwuKH_vd2TqYmYRQkYos5y3GdVSzPQZoFu3JQFNw/exec'

const TAG = 'vs-datos'
const TTL = 15
const BACKOFFS = [0, 800, 2000, 4000]
const ACCIONES_LECTURA = ['get_ciudades', 'get_gm_table', 'login']  // pasan directas, no purgan

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

function reenviar(texto, status, contentType) {
  return new NextResponse(texto, {
    status,
    headers: { 'Content-Type': contentType || 'application/json; charset=utf-8' },
  })
}

export async function GET(req) {
  const params = new URLSearchParams(req.nextUrl.searchParams)
  params.delete('_t')
  const action = params.get('action') || ''
  const esAccion = !!action
  const destino = SCRIPT_URL + (params.toString() ? '?' + params.toString() : '')

  if (esAccion) {
    let ultimoError
    for (let i = 0; i < BACKOFFS.length; i++) {
      if (BACKOFFS[i]) await espera(BACKOFFS[i])
      try {
        const r = await fetch(destino, { cache: 'no-store', redirect: 'follow' })
        if (r.status === 404 || r.status >= 500) { ultimoError = new Error('status ' + r.status); continue }
        const texto = await r.text()
        if (ACCIONES_LECTURA.indexOf(action) === -1) { try { revalidateTag(TAG) } catch (e) {} }
        return reenviar(texto, r.status, r.headers.get('content-type'))
      } catch (e) { ultimoError = e }
    }
    return NextResponse.json({ ok: false, error: 'No se pudo procesar la solicitud. Intenta de nuevo.' }, { status: 502 })
  }

  let ultimoError
  for (let i = 0; i < BACKOFFS.length; i++) {
    if (BACKOFFS[i]) await espera(BACKOFFS[i])
    try {
      const r = await fetch(destino, { redirect: 'follow', next: { revalidate: TTL, tags: [TAG] } })
      if (r.status === 404 || r.status >= 500) {
        try { revalidateTag(TAG) } catch (e) {}
        ultimoError = new Error('status ' + r.status)
        continue
      }
      const texto = await r.text()
      return reenviar(texto, r.status, r.headers.get('content-type'))
    } catch (e) { ultimoError = e }
  }
  return NextResponse.json({ ok: false, error: 'El servicio no respondió. Intenta de nuevo en un momento.' }, { status: 502 })
}

// POST (subir_boleta / subir_subsanacion): directo, sin caché, purga al final.
export async function POST(req) {
  let cuerpo
  try { cuerpo = await req.text() } catch { return NextResponse.json({ ok: false, error: 'Petición mal formada' }, { status: 400 }) }

  let ultimoError
  for (let i = 0; i < BACKOFFS.length; i++) {
    if (BACKOFFS[i]) await espera(BACKOFFS[i])
    try {
      const r = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: cuerpo,
        redirect: 'follow',
        cache: 'no-store',
      })
      if (r.status === 404 || r.status >= 500) { ultimoError = new Error('status ' + r.status); continue }
      const texto = await r.text()
      try { revalidateTag(TAG) } catch (e) {}
      return reenviar(texto, r.status, r.headers.get('content-type'))
    } catch (e) { ultimoError = e }
  }
  return NextResponse.json({ ok: false, error: 'No se pudo subir el archivo. Intenta de nuevo.' }, { status: 502 })
}

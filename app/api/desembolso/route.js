// app/api/desembolso/route.js — Puente (BFF) con CACHÉ + REINTENTO para Desembolso.
//
// Despliega SOLO con commit a GitHub (Vercel construye solo). No requiere variable
// de entorno ni tocar el panel de Vercel: la URL vive aquí, en el SERVIDOR, y este
// archivo NUNCA se envía al navegador, así que la URL no queda expuesta.
//
// Qué hace:
//   1) CARGA DE DATOS (sin 'accion'): se sirve de una caché compartida (revalida
//      cada TTL s) → muchos usuarios comparten UNA lectura → sin saturación y carga
//      instantánea cuando está caliente.
//   2) ACCIONES ('accion=...'): SIEMPRE directas al Apps Script, nunca desde caché;
//      al terminar PURGAN la caché → el cambio se ve al instante en la recarga.
//   3) Reintenta ante 404/5xx (arranque en frío) → el usuario deja de ver el 404.
//
// La hoja es siempre la fuente de verdad; la caché solo cambia qué tan rápido un
// usuario que SOLO MIRA ve una actualización (a lo sumo TTL segundos).
import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

// URL /exec del Apps Script de Desembolso. Si algún día defines la variable
// DESEMBOLSO_SCRIPT_URL en Vercel, esa tiene prioridad; si no, usa esta.
const SCRIPT_URL = process.env.DESEMBOLSO_SCRIPT_URL
  || 'https://script.google.com/macros/s/AKfycbxE8kT5hBbav2OT-kiCSj3jz2xg_XW2v0y3DkUwHRBTAaaI0AgPTVHpbzL-_rHI9hhNHw/exec'

const TAG = 'desembolso-datos'
const TTL = 15                          // segundos de caché para la carga de datos
const BACKOFFS = [0, 800, 2000, 4000]   // reintentos ante 404/5xx (cold start)

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

function reenviar(texto, status, contentType) {
  return new NextResponse(texto, {
    status,
    headers: { 'Content-Type': contentType || 'application/json; charset=utf-8' },
  })
}

export async function GET(req) {
  const params = new URLSearchParams(req.nextUrl.searchParams)
  params.delete('_t')                       // buster del navegador → lo quitamos para cachear
  const esAccion = params.has('accion')
  const destino = SCRIPT_URL + (params.toString() ? '?' + params.toString() : '')

  // ── ACCIONES ────────────────────────────────────────────────────────────────
  if (esAccion) {
    let ultimoError
    for (let i = 0; i < BACKOFFS.length; i++) {
      if (BACKOFFS[i]) await espera(BACKOFFS[i])
      try {
        const r = await fetch(destino, { cache: 'no-store', redirect: 'follow' })
        if (r.status === 404 || r.status >= 500) { ultimoError = new Error('status ' + r.status); continue }
        const texto = await r.text()
        try { revalidateTag(TAG) } catch (e) {}   // el cambio se ve al instante
        return reenviar(texto, r.status, r.headers.get('content-type'))
      } catch (e) { ultimoError = e }
    }
    return NextResponse.json({ ok: false, error: 'No se pudo procesar la acción. Intenta de nuevo.' }, { status: 502 })
  }

  // ── CARGA DE DATOS ──────────────────────────────────────────────────────────
  let ultimoError
  for (let i = 0; i < BACKOFFS.length; i++) {
    if (BACKOFFS[i]) await espera(BACKOFFS[i])
    try {
      const r = await fetch(destino, { redirect: 'follow', next: { revalidate: TTL, tags: [TAG] } })
      if (r.status === 404 || r.status >= 500) {
        try { revalidateTag(TAG) } catch (e) {}   // no dejar cacheada una respuesta mala
        ultimoError = new Error('status ' + r.status)
        continue
      }
      const texto = await r.text()
      return reenviar(texto, r.status, r.headers.get('content-type'))
    } catch (e) { ultimoError = e }
  }
  return NextResponse.json({ error: 'El servicio no respondió. Intenta de nuevo en un momento.' }, { status: 502 })
}

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Sin caché — siempre datos frescos

export async function GET() {
  const url = process.env.SHEETS_CSV_URL

  if (!url) {
    return NextResponse.json({ error: 'SHEETS_CSV_URL no configurada en variables de entorno' }, { status: 500 })
  }

  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Error al obtener el sheet: ${res.status}`)
    const csv = await res.text()
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8' }
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

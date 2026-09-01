// app/page.js — Pantalla selectora de GoTrack (Opción 2: insignia con inicial).
// Reemplaza la redirección temporal del Paso 2. Es la nueva raíz: el usuario
// elige entre las caras del sistema. Componente de servidor (sin estado ni
// 'use client'): solo enlaces. Cuando Levantamiento se fusione al repo (más
// adelante), su enlace externo pasa a ser interno "/levantamiento".

export const metadata = {
  title: 'GoTrack',
  description: 'Seguimiento legal — Global Go',
}

const CARAS = [
  {
    nombre: 'Desembolso',
    desc: 'Contratos de crédito y validación de firmas',
    href: '/desembolso',
    inicial: 'D',
    color: '#185FA5',
    badgeBg: '#E6F1FB',
    externo: false,
  },
  {
    nombre: 'Ventas de Segunda',
    desc: 'Transferencias vehiculares y citas notariales',
    href: '/ventas-segunda',
    inicial: 'V',
    color: '#534AB7',
    badgeBg: '#EEEDFE',
    externo: false,
  },
  {
    nombre: 'Levantamiento',
    desc: 'Levantamiento de garantía mobiliaria',
    href: 'https://globalgo-levantamiento-gm.vercel.app/?v=final',
    inicial: 'L',
    color: '#0F6E56',
    badgeBg: '#E1F5EE',
    externo: true,
  },
]

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B4B2A9"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ flexShrink: 0 }}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export default function Selector() {
  return (
    <div style={{ minHeight: '100vh', background: '#F1EFE8', display: 'flex', flexDirection: 'column' }}>
      {/* Encabezado */}
      <header style={{ backgroundColor: '#1A2238', padding: '28px 16px 24px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ color: 'white', fontWeight: 500, fontSize: 20, lineHeight: 1.1 }}>GoTrack</div>
          <div style={{ color: '#9BB4D8', fontSize: 12, marginTop: 4 }}>Selecciona un módulo</div>
        </div>
      </header>

      {/* Tarjetas de caras */}
      <main style={{ maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box',
        padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {CARAS.map(cara => (
          <a
            key={cara.nombre}
            href={cara.href}
            {...(cara.externo ? { rel: 'noopener' } : {})}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              background: 'white', borderRadius: 12, textDecoration: 'none',
              border: '0.5px solid #D3D1C7', padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: cara.badgeBg, color: cara.color, fontSize: 18, fontWeight: 600,
              }}>
                {cara.inicial}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#1A2238', lineHeight: 1.2 }}>
                  {cara.nombre}
                </div>
                <div style={{ fontSize: 12, color: '#5F5E5A', marginTop: 3 }}>
                  {cara.desc}
                </div>
              </div>
            </div>
            <Chevron />
          </a>
        ))}
      </main>

      {/* Pie */}
      <footer style={{ textAlign: 'center', padding: '16px' }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#1A2238', letterSpacing: '0.11em', margin: 0 }}>
          POWERED BY LEGAL TEAM · GLOBAL GO
        </p>
      </footer>
    </div>
  )
}

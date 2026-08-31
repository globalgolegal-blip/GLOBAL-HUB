// lib/theme.js — Tokens de diseño de GoTrack (fuente ÚNICA de estilo).
// Se importa desde los componentes para no repetir hex/tamaños sueltos.
// Vale para ambas pestañas: Desembolso (dashboard principal) y Ventas de segunda.

// ── Paleta ───────────────────────────────────────────────────────────────
export const COLOR = {
  navy:       '#1A2238',   // marca / primario / texto fuerte
  navySoft:   '#2D3A5A',   // bordes sobre navy
  navyText:   '#9BB4D8',   // texto secundario sobre navy
  bg:         '#F1EFE8',   // fondo de página
  surface:    '#FFFFFF',   // tarjetas
  border:     '#D3D1C7',   // borde hairline
  borderSoft: '#E8E6DF',   // borde muy sutil
  text:       '#1A2238',   // texto principal
  textSec:    '#5F5E5A',   // texto secundario
  textMuted:  '#888780',   // hints / metadatos
}

// Estados — un color por estado, alineado a ESTADO_CONFIG / ESTADO_CONFIG_VS.
// { fg: texto/acento, bg: fondo suave del badge }
export const ESTADO_COLOR = {
  blue:   { fg: '#185FA5', bg: '#E6F1FB' },  // por firmar / ingresado
  purple: { fg: '#534AB7', bg: '#EEEDFE' },  // emitidos
  amber:  { fg: '#BA7517', bg: '#FAEEDA' },  // observados / confirmado
  teal:   { fg: '#0F6E56', bg: '#E1F5EE' },  // validado / legal
  coral:  { fg: '#993C1D', bg: '#FAECE7' },  // firma observada
  red:    { fg: '#A32D2D', bg: '#FCEBEB' },  // vencido / urgente
  orange: { fg: '#CC5500', bg: '#FFF0E6' },  // solicitado
  gray:   { fg: '#5F5E5A', bg: '#F1EFE8' },  // anulado / neutro
}

// ── Tipografía ───────────────────────────────────────────────────────────
// Escala corta. Nada por debajo de 11px. Solo dos pesos.
export const FONT = {
  xs:  '11px',   // metadatos, chips pequeños
  sm:  '12px',   // etiquetas, texto secundario
  md:  '13px',   // cuerpo, botones
  lg:  '15px',   // títulos de tarjeta / marca
  xl:  '18px',   // números medianos
  xxl: '24px',   // números destacados (categorías)
}
export const WEIGHT = { regular: 400, medium: 500 }

// ── Radios y espaciado ───────────────────────────────────────────────────
export const RADIUS = { sm: '8px', card: '12px', pill: '20px' }
export const SPACE  = { xs: '6px', sm: '8px', md: '10px', lg: '12px', xl: '16px' }

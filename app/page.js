// app/page.js — Raíz de GoTrack.
// TEMPORAL: hasta que el Paso 3 ponga aquí la pantalla selectora de caras,
// la raíz redirige a Desembolso. Así los enlaces que apuntan a "/" (correos de
// reporte, botón "← Desembolso" de VS) siguen funcionando sin cambios.
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/desembolso')
}

import './globals.css'
import { Analytics } from '@vercel/analytics/next'

export const metadata = {
  title: 'GoTrack',
  description: 'Seguimiento de contratos — Go',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#1A2238',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="GoTrack" />
      </head>
      <body className="bg-[#f0f4f8] min-h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  )
}

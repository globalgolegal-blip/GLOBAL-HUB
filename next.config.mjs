/** @type {import('next').NextConfig} */
// Ventas de Segunda se separó a su propio repo (GOTRACK-VS) y proyecto de Vercel.
// Los enlaces y marcadores antiguos a /ventas-segunda se redirigen a la URL nueva.
const VS_URL = 'https://gotrack-vs.vercel.app'

const nextConfig = {
  async redirects() {
    return [
      { source: '/ventas-segunda', destination: VS_URL + '/ventas-segunda', permanent: false },
      { source: '/ventas-segunda/:path*', destination: VS_URL + '/ventas-segunda/:path*', permanent: false },
    ]
  },
}

export default nextConfig

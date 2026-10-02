export default defineEventHandler(event => {
  setHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  })
  if (!import.meta.dev) {
    setHeader(event, 'Strict-Transport-Security', 'max-age=31536000')
    setHeader(event, 'Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'")
  }
  if (event.path.startsWith('/api/')) setHeader(event, 'Cache-Control', 'no-store')
})

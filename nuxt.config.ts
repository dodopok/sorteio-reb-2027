export default defineNuxtConfig({
  compatibilityDate: '2026-10-02',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  typescript: { strict: true },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Sorteio de livros · 2ª Conferência Teológica REB',
      meta: [{ name: 'theme-color', content: '#6f1f52' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  runtimeConfig: {
    databaseUrl: '',
    adminEmail: 'dev@dodopok.dev',
    adminPasswordHash: '',
    ipHashSecret: '',
    turnstileSecretKey: '',
    public: {
      siteUrl: 'https://sorteio.redeepiscopalbrasileira.com.br',
      turnstileSiteKey: '',
      organizerName: 'Rede Episcopal Brasileira',
      organizerCnpj: '',
      privacyEmail: 'dev@dodopok.dev',
    },
  },
  routeRules: {
    '/admin/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' } },
    '/api/**': { headers: { 'Cache-Control': 'no-store' } },
    '/gc': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/ensaio': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/fonts/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
  },
})

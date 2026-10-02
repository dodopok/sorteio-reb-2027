import { defineRailway, github, postgres, preserve, project, service } from 'railway/iac'

// First creation: values come from the operator's environment, never from Git.
// Later plans preserve the existing Railway values when no value is supplied.
const privateVariable = (name: string) => process.env[name]
  ? { value: process.env[name], isSealed: true }
  : preserve()
const publicVariable = (name: string) => process.env[name] || preserve()

export default defineRailway(() => {
  const database = postgres('Postgres')
  const app = service('Sorteio REB', {
    source: github('dodopok/sorteio-reb-2027', { branch: 'main' }),
    build: { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
    start: 'node .output/server/index.mjs',
    preDeploy: 'node scripts/migrate.mjs',
    healthcheck: '/api/health',
    healthcheckTimeout: 60,
    domains: [{ domain: 'sorteio.redeepiscopalbrasileira.com.br', port: 3000 }],
    env: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: '3000',
      NUXT_DATABASE_URL: database.env.DATABASE_URL,
      NUXT_ADMIN_EMAIL: 'dev@dodopok.dev',
      NUXT_ADMIN_PASSWORD_HASH: privateVariable('NUXT_ADMIN_PASSWORD_HASH'),
      NUXT_IP_HASH_SECRET: privateVariable('NUXT_IP_HASH_SECRET'),
      NUXT_TURNSTILE_SECRET_KEY: privateVariable('NUXT_TURNSTILE_SECRET_KEY'),
      NUXT_PUBLIC_TURNSTILE_SITE_KEY: publicVariable('NUXT_PUBLIC_TURNSTILE_SITE_KEY'),
      NUXT_PUBLIC_SITE_URL: 'https://sorteio.redeepiscopalbrasileira.com.br',
      NUXT_PUBLIC_ORGANIZER_NAME: 'Rede Episcopal Brasileira',
      NUXT_PUBLIC_PRIVACY_EMAIL: 'dev@dodopok.dev',
    },
  })
  return project('sorteio-reb-2027', { resources: [database, app] })
})

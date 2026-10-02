export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  if (!config.databaseUrl || !config.adminPasswordHash || config.ipHashSecret.length < 32
    || (!import.meta.dev && (!config.turnstileSecretKey || !config.public.turnstileSiteKey))) {
    throw createError({ statusCode: 503, statusMessage: 'Configuration incomplete' })
  }
  try {
    await db()`SELECT id FROM reb_event WHERE id = 1`
    return { ok: true }
  } catch { throw createError({ statusCode: 503, statusMessage: 'Database unavailable' }) }
})

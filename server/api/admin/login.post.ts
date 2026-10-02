import { z } from 'zod'

export default defineEventHandler(async event => {
  assertOrigin(event)
  await rateLimit(event, 'login', 5, 900)
  const parsed = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), password: z.string().min(1).max(256) }).safeParse(await limitedBody(event))
  if (!parsed.success) throw createError({ statusCode: 401, statusMessage: 'E-mail ou senha incorretos.' })
  const config = useRuntimeConfig()
  if (!config.adminPasswordHash) throw createError({ statusCode: 503, statusMessage: 'Configure o acesso do administrador antes de entrar.' })
  const matches = await verifyPassword(parsed.data.password, config.adminPasswordHash)
  if (!matches || parsed.data.email !== config.adminEmail.trim().toLowerCase()) {
    throw createError({ statusCode: 401, statusMessage: 'E-mail ou senha incorretos.' })
  }
  try { await createAdminSession(event) } catch (error) { databaseError(error) }
  return { ok: true }
})

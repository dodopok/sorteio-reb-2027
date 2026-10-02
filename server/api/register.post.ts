import { CONSENT_VERSION } from '#shared/raffle'
import { registrationSchema } from '../utils/validation'

export default defineEventHandler(async event => {
  assertOrigin(event)
  await rateLimit(event, 'register', 15, 600)
  const parsed = registrationSchema.safeParse(await limitedBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Confira nome, e-mail, WhatsApp e os consentimentos.' })
  const input = parsed.data
  const config = useRuntimeConfig()
  if (!import.meta.dev || config.turnstileSecretKey) {
    if (!config.turnstileSecretKey || !input.turnstileToken) {
      throw createError({ statusCode: 400, statusMessage: 'Conclua a verificação de segurança e tente novamente.' })
    }
    let check
    try {
      check = await $fetch<{ success: boolean; hostname?: string; action?: string }>('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', body: { secret: config.turnstileSecretKey, response: input.turnstileToken, remoteip: requestIp(event) }, timeout: 8000,
      })
    } catch { throw createError({ statusCode: 503, statusMessage: 'A verificação está indisponível. Tente novamente.' }) }
    const host = new URL(config.public.siteUrl).hostname
    if (!check.success || check.hostname !== host || check.action !== 'register') {
      throw createError({ statusCode: 400, statusMessage: 'A verificação expirou. Tente novamente.' })
    }
  }
  try {
    await db()`SELECT reb_register(${input.name}, ${input.email}, ${input.whatsapp}, ${CONSENT_VERSION})`
  } catch (error) { databaseError(error) }
  // Equal response for a fresh registration and duplicates: no contact enumeration.
  return { received: true }
})

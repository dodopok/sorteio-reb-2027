import { z } from 'zod'

export default defineEventHandler(async event => {
  assertOrigin(event)
  await requireAdmin(event)
  await rateLimit(event, 'admin-state', 20, 60)
  const input = z.object({ status: z.enum(['open', 'closed']), generation: z.number().int().positive() }).safeParse(await limitedBody(event))
  if (!input.success) throw createError({ statusCode: 400, statusMessage: 'Ação inválida.' })
  try { await db()`SELECT reb_set_status(${input.data.status}) FROM reb_assert_generation(${input.data.generation}, true)` }
  catch (error) { databaseError(error) }
  return { ok: true }
})

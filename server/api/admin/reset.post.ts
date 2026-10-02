import { z } from 'zod'
import { prizes } from '#shared/raffle'

export default defineEventHandler(async event => {
  assertOrigin(event)
  await requireAdmin(event)
  await rateLimit(event, 'admin-reset', 5, 600)
  const input = z.object({
    confirmation: z.literal('APAGAR TESTES'),
    generation: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    winners: z.number().int().min(0).max(prizes.length),
  }).strict().safeParse(await limitedBody(event))
  if (!input.success) throw createError({ statusCode: 400, statusMessage: 'Digite APAGAR TESTES para confirmar a exclusão.' })
  try {
    const rows = await db()`SELECT reb_reset(${input.data.generation}, ${input.data.total}, ${input.data.winners}) AS generation`
    return { ok: true, generation: Number(rows[0]!.generation) }
  } catch (error) { databaseError(error) }
})

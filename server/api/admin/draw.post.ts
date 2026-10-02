import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import type { Winner } from '#shared/raffle'

export default defineEventHandler(async event => {
  assertOrigin(event)
  await requireAdmin(event)
  await rateLimit(event, 'admin-draw', 15, 60)
  const input = z.object({ requestId: z.uuid(), prizeId: z.number().int().min(1).max(3) }).safeParse(await limitedBody(event))
  if (!input.success) throw createError({ statusCode: 400, statusMessage: 'Solicitação de sorteio inválida.' })
  try {
    const rows = await db()`SELECT reb_draw(${input.data.requestId}, ${input.data.prizeId}, ${randomBytes(128)}) AS winner`
    return rows[0]!.winner as Winner
  } catch (error) { databaseError(error) }
})

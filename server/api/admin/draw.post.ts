import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { CONSENT_VERSION } from '#shared/raffle'
import type { DrawResult } from '#shared/raffle'

export default defineEventHandler(async (event): Promise<DrawResult> => {
  assertOrigin(event)
  await requireAdmin(event)
  await rateLimit(event, 'admin-draw', 15, 60)
  const input = z.object({ requestId: z.uuid(), prizeId: z.number().int().min(1).max(3), generation: z.number().int().positive() }).safeParse(await limitedBody(event))
  if (!input.success) throw createError({ statusCode: 400, statusMessage: 'Solicitação de sorteio inválida.' })
  try {
    return await db().begin(async sql => {
      await sql`SELECT reb_assert_generation(${input.data.generation}, true)`
      const rows = await sql`SELECT reb_draw(${input.data.requestId}, ${input.data.prizeId}, ${randomBytes(128)}) AS winner`
      // Only first names with the updated consent enter the animation.
      // Contacts and non-winners' full names never leave this endpoint.
      const names = await sql`SELECT DISTINCT split_part(trim(p.name), ' ', 1) AS name FROM reb_participants p
        WHERE p.consent_version = ${CONSENT_VERSION} AND NOT EXISTS (
          SELECT 1 FROM reb_draws d WHERE d.participant_id = p.id AND d.prize_id < ${input.data.prizeId}
        ) ORDER BY name LIMIT 100`
      return { ...rows[0]!.winner, animationNames: names.map(row => row.name as string) } as DrawResult
    })
  } catch (error) { databaseError(error) }
})

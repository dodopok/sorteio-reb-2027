import type { RaffleStatus } from '#shared/raffle'

// Coalesce concurrent page loads and keep this public read cheap under bursts.
type PublicStatus = { status: RaffleStatus; available: boolean; generation: number }
let cached: PublicStatus | undefined
let cachedUntil = 0
let pending: Promise<PublicStatus> | undefined
async function readStatus() {
  try {
    const rows = await db()`SELECT status, generation FROM reb_event WHERE id = 1`
    return { status: (rows[0]?.status ?? 'draft') as RaffleStatus, available: true, generation: Number(rows[0]?.generation ?? 1) }
  } catch {
    return { status: 'draft' as RaffleStatus, available: false, generation: 0 }
  }
}
export default defineEventHandler(async () => {
  if (cached && cachedUntil > Date.now()) return cached
  pending ??= readStatus().then(value => { cached = value; cachedUntil = Date.now() + 1000; return value }).finally(() => { pending = undefined })
  return pending
})

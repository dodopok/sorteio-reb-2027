import type { RaffleStatus } from '#shared/raffle'

// Coalesce concurrent page loads and keep this public read cheap under bursts.
let cached: { status: RaffleStatus; available: boolean } | undefined
let cachedUntil = 0
let pending: Promise<{ status: RaffleStatus; available: boolean }> | undefined
async function readStatus() {
  try {
    const rows = await db()`SELECT status FROM reb_event WHERE id = 1`
    return { status: (rows[0]?.status ?? 'draft') as RaffleStatus, available: true }
  } catch {
    return { status: 'draft' as RaffleStatus, available: false }
  }
}
export default defineEventHandler(async () => {
  if (cached && cachedUntil > Date.now()) return cached
  pending ??= readStatus().then(value => { cached = value; cachedUntil = Date.now() + 1000; return value }).finally(() => { pending = undefined })
  return pending
})

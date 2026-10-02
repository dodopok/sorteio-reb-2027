import type { Dashboard } from '#shared/raffle'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  try {
    const rows = await db()`SELECT reb_dashboard() - 'contacts' AS data`
    return rows[0]!.data as Omit<Dashboard, 'contacts'>
  } catch (error) { databaseError(error) }
})

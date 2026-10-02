import { prizes } from '#shared/raffle'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  await rateLimit(event, 'export', 5, 60)
  try {
    const rows = await db()`SELECT d.prize_id, p.name, p.email, p.whatsapp, d.drawn_at FROM reb_draws d JOIN reb_participants p ON p.id = d.participant_id ORDER BY d.prize_id`
    const escape = (value: unknown) => '"' + String(value ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"'
    setHeaders(event, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="ganhadores-reb.csv"' })
    return '\ufeff' + [['Rodada', 'Prêmio', 'Responsável pelo envio', 'Nome', 'E-mail', 'WhatsApp', 'Sorteado em'], ...rows.map(r => [r.prize_id, prizes[r.prize_id - 1]?.title, prizes[r.prize_id - 1]?.shipping, r.name, r.email, r.whatsapp, r.drawn_at])].map(r => r.map(escape).join(';')).join('\r\n')
  } catch (error) { databaseError(error) }
})

import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { randomBytes, randomUUID } from 'node:crypto'
import postgres from 'postgres'

const url = process.env.REB_TEST_DATABASE_URL
if (url && !new URL(url).pathname.endsWith('_test')) throw new Error('Os testes só podem usar um banco com nome terminado em _test.')
const suite = url ? describe : describe.skip
suite('sorteio transacional em PostgreSQL real', () => {
  const sql = postgres(url!, { max: 20, onnotice: () => {} })
  beforeAll(async () => { await sql.unsafe(await readFile(new URL('../../database/001_schema.sql', import.meta.url), 'utf8')) })
  beforeEach(async () => { await sql`TRUNCATE reb_draws, reb_participants, reb_sessions, reb_limits`; await sql`UPDATE reb_event SET status = 'open' WHERE id = 1` })
  afterAll(async () => { await sql.end() })
  const register = (i: number, email = `pessoa${i}@example.com`, phone = `+55119${String(12340000 + i).padStart(8, '0')}`) => sql`SELECT reb_register('Pessoa Teste', ${email}, ${phone}, '2026-10-03-v1')`
  const draw = (id: string, prizeId: number) => sql`SELECT reb_draw(${id}, ${prizeId}, ${randomBytes(128)}) AS winner`

  it('registra 500 pessoas simultaneamente, sem perder dados, e faz três sorteios sem repetição', async () => {
    const started = performance.now()
    await Promise.all(Array.from({ length: 500 }, (_, i) => register(i)))
    const rows = await sql`SELECT count(*)::integer AS n FROM reb_participants`
    expect(rows[0]!.n).toBe(500)
    console.log(`500 inscrições concorrentes: ${Math.round(performance.now() - started)} ms (banco local)`)
    await sql`SELECT reb_set_status('closed')`
    const winners = []
    for (let i = 1; i <= 3; i++) winners.push((await draw(randomUUID(), i))[0]!.winner)
    expect(new Set(winners.map(w => w.id)).size).toBe(3)
    expect(winners.map(w => w.eligibleCount)).toEqual([500, 499, 498])
    expect(winners.every(w => w.poolHash.length === 64)).toBe(true)
    const unique = await sql`SELECT count(DISTINCT participant_id)::integer AS n FROM reb_draws`
    expect(unique[0]!.n).toBe(3)
    await expect(draw(randomUUID(), 3)).rejects.toMatchObject({ code: 'RE003' })
    await expect(sql`SELECT reb_set_status('open')`).rejects.toMatchObject({ code: 'RE005' })
  })
  it('bloqueia duplicidades concorrentes de email ou WhatsApp e aliases do Gmail', async () => {
    await Promise.all(Array.from({ length: 100 }, (_, i) => register(i, 'mesma.pessoa+live@gmail.com')))
    await register(999, 'mesmapessoa@googlemail.com')
    const registered = await sql`SELECT whatsapp FROM reb_participants LIMIT 1`
    await register(0, 'outro@example.com', registered[0]!.whatsapp)
    expect((await sql`SELECT count(*)::integer AS n FROM reb_participants`)[0]!.n).toBe(1)
  })
  it('torna os cliques repetidos idempotentes e bloqueia duas telas sorteando o mesmo livro', async () => {
    await Promise.all([register(1), register(2), register(3)])
    await sql`SELECT reb_set_status('closed')`
    const id = randomUUID()
    const repeated = await Promise.all(Array.from({ length: 20 }, () => draw(id, 1)))
    expect(new Set(repeated.map(r => r[0]!.winner.id)).size).toBe(1)
    await expect(draw(randomUUID(), 1)).rejects.toMatchObject({ code: 'RE007' })
    const competing = await Promise.allSettled(Array.from({ length: 20 }, () => draw(randomUUID(), 2)))
    expect(competing.filter(r => r.status === 'fulfilled').length).toBe(1)
    expect((await sql`SELECT count(*)::integer AS n FROM reb_draws`)[0]!.n).toBe(2)
  })
  it('não aceita cadastros após o encerramento e não sorteia antes de encerrar', async () => {
    await expect(draw(randomUUID(), 1)).rejects.toMatchObject({ code: 'RE002' })
    await expect(sql`SELECT reb_set_status('closed')`).rejects.toMatchObject({ code: 'RE006' })
    await Promise.all([register(1), register(2), register(3)])
    await sql`SELECT reb_set_status('closed')`
    await expect(register(4)).rejects.toMatchObject({ code: 'RE001' })
  })
  it('mantém o limite de tentativas consistente em chamadas concorrentes', async () => {
    const result = await Promise.all(Array.from({ length: 50 }, () => sql`SELECT * FROM reb_rate_limit('teste', 5, 60)`))
    expect(result.filter(r => r[0]!.allowed).length).toBe(5)
    expect(result.every(r => r[0]!.retry_after > 0)).toBe(true)
  })
  it('retorna ao palco somente os nomes consentidos e preserva os contatos para o admin', async () => {
    await Promise.all([register(1), register(2), register(3)])
    await sql`SELECT reb_set_status('closed')`
    await draw(randomUUID(), 1)
    const stage = (await sql`SELECT reb_dashboard() - 'contacts' AS data`)[0]!.data
    expect(stage.contacts).toBeUndefined()
    expect(JSON.stringify(stage)).not.toContain('@example.com')
    expect(JSON.stringify(stage)).not.toContain('+5511')
    expect(stage.winners[0].name).toBe('Pessoa Teste')
  })
})

import { test, expect } from '@playwright/test'
import postgres from 'postgres'

const dbUrl = process.env.REB_TEST_DATABASE_URL
test.beforeAll(async () => {
  if (!dbUrl || !new URL(dbUrl).pathname.endsWith('_test')) throw new Error('Defina REB_TEST_DATABASE_URL com um banco de testes.')
  const sql = postgres(dbUrl, { max: 1 })
  await sql`TRUNCATE reb_draws, reb_participants, reb_sessions, reb_limits`
  await sql`UPDATE reb_event SET status = 'open' WHERE id = 1`
  for (let i = 1; i <= 4; i++) await sql`SELECT reb_register(${`Participante Teste ${i}`}, ${`teste${i}@example.com`}, ${`+551198123000${i}`}, '2026-10-03-v1')`
  await sql.end()
})

test('cadastro pelo celular, consentimento e confirmação sem duplicar chances', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Quero participar do sorteio' })).toBeEnabled()
  await page.getByLabel('Nome completo').fill('Maria de Fátima')
  await page.getByLabel('WhatsApp').fill('11987654321')
  await page.getByLabel('E-mail', { exact: true }).fill('maria@example.com')
  await page.getByRole('button', { name: 'Quero participar do sorteio' }).click()
  await expect(page.getByText('Confirme os dois itens')).toBeVisible()
  await page.getByRole('checkbox').nth(0).check()
  await page.getByRole('checkbox').nth(1).check()
  await page.getByRole('button', { name: 'Quero participar do sorteio' }).click()
  await expect(page.getByText('INSCRIÇÃO RECEBIDA', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('INSCRIÇÃO RECEBIDA', { exact: true })).toBeVisible()
  const repeated = await request.post('/api/register', { headers: { Origin: 'http://127.0.0.1:3000' }, data: { name: 'Maria de Fátima', email: 'maria@example.com', whatsapp: '(11) 98765-4321', adult: true, consent: true } })
  expect(repeated.status()).toBe(200)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('protege as APIs, autentica, encerra e recupera sorteio após recarregar', async ({ page, request }) => {
  expect((await request.get('/api/admin/dashboard')).status()).toBe(401)
  expect((await request.post('/api/admin/state', { headers: { Origin: 'https://malicioso.example' }, data: { status: 'open' } })).status()).toBe(403)
  const large = await request.post('/api/register', { headers: { Origin: 'http://127.0.0.1:3000', 'Content-Type': 'application/json' }, data: JSON.stringify({ name: 'x'.repeat(10000) }) })
  expect(large.status()).toBe(413)
  await page.goto('/admin/login')
  await expect(page.getByRole('button', { name: 'Entrar no painel' })).toBeEnabled()
  await page.getByLabel('E-mail', { exact: true }).fill('dev@dodopok.dev')
  await page.getByLabel('Senha').fill('reb-local-test-Only-2026!')
  await page.getByRole('button', { name: 'Entrar no painel' }).click()
  await expect(page).toHaveURL('/admin')
  await page.getByRole('button', { name: 'Encerrar inscrições', exact: true }).click()
  await page.getByRole('button', { name: 'Sim, encerrar' }).click()
  await expect(page.getByText('Inscrições encerradas', { exact: true })).toBeVisible()
  await page.goto('/admin/palco')
  await page.getByRole('button', { name: 'Sortear agora' }).click()
  await expect(page.getByText('ESSE LIVRO É SEU!')).toBeVisible({ timeout: 10000 })
  const winner = await page.locator('.winner-name').innerText()
  expect(await page.locator('body').innerText()).not.toMatch(/@example\.com|\+5511/)
  await page.reload()
  await expect(page.locator('.winner-name')).toHaveText(winner)
  await page.getByRole('button', { name: 'Próximo livro' }).click()
  await expect(page.getByText('SORTEIO 02 DE 03')).toBeVisible()
  await page.getByRole('button', { name: 'Sortear agora' }).click()
  await expect(page.getByText('ESSE LIVRO É SEU!')).toBeVisible({ timeout: 10000 })
  await page.goto('/admin')
  await expect(page.getByText('maria@example.com')).not.toBeVisible()
  await page.getByRole('button', { name: 'Mostrar contatos' }).click()
  await expect(page.locator('table tbody tr')).toHaveCount(2)
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page).toHaveURL('/admin/login')
  expect((await page.request.get('/api/admin/dashboard')).status()).toBe(401)
})

test('ensaio completo sem acessar dados reais e QR Code apontando para o domínio correto', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/ensaio')
  await expect(page.getByText('ENSAIO · DADOS FICTÍCIOS')).toBeVisible()
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Ensaiar sorteio' }).click()
    await expect(page.getByText('ESSE LIVRO É SEU!')).toBeVisible({ timeout: 10000 })
    if (i < 2) await page.getByRole('button', { name: 'Próximo livro' }).click()
  }
  await expect(page.getByRole('button', { name: 'Repetir ensaio' })).toBeVisible()
  await page.goto('/gc')
  await expect(page.getByText('sorteio.redeepiscopalbrasileira.com.br')).toBeVisible()
  const qr = page.locator('.gc-qr img')
  await expect(qr).toBeVisible()
  const decoded = await page.evaluate(async () => {
    const Constructor = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => { detect: (image: HTMLImageElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
    if (!Constructor) return 'unsupported'
    return (await new Constructor({ formats: ['qr_code'] }).detect(document.querySelector('.gc-qr img')!))[0]?.rawValue
  })
  if (decoded !== 'unsupported') expect(decoded).toBe('https://sorteio.redeepiscopalbrasileira.com.br')
})

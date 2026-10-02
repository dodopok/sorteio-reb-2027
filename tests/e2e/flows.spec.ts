import { test, expect } from '@playwright/test'
import postgres from 'postgres'

const dbUrl = process.env.REB_TEST_DATABASE_URL
const origin = process.env.REB_TEST_BASE_URL || 'http://127.0.0.1:3000'
test.beforeAll(async () => {
  if (!dbUrl || !new URL(dbUrl).pathname.endsWith('_test')) throw new Error('Defina REB_TEST_DATABASE_URL com um banco de testes.')
  const sql = postgres(dbUrl, { max: 1 })
  await sql`TRUNCATE reb_draws, reb_participants, reb_sessions, reb_limits`
  await sql`UPDATE reb_event SET status = 'open', generation = 1 WHERE id = 1`
  const names = ['Rafael Teste', 'Camila Teste', 'Lucas Teste', 'Ana Teste']
  for (let i = 1; i <= 4; i++) await sql`SELECT reb_register(${names[i - 1]!}, ${`teste${i}@example.com`}, ${`+551198123000${i}`}, ${i === 4 ? '2026-10-03-v1' : '2026-10-03-v2'})`
  await sql.end()
})

test('cadastro pelo celular, consentimento e confirmação sem duplicar chances', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Quero participar do sorteio' })).toBeEnabled()
  await page.getByLabel('Nome completo', { exact: true }).fill('Maria de Fátima')
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
  const repeated = await request.post('/api/register', { headers: { Origin: origin }, data: { name: 'Maria de Fátima', email: 'maria@example.com', whatsapp: '(11) 98765-4321', adult: true, consent: true, generation: 1 } })
  expect(repeated.status()).toBe(200)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('protege as APIs, autentica, encerra e recupera sorteio após recarregar', async ({ page, request }) => {
  expect((await request.get('/api/admin/dashboard')).status()).toBe(401)
  expect((await request.post('/api/admin/state', { headers: { Origin: 'https://malicioso.example' }, data: { status: 'open' } })).status()).toBe(403)
  const large = await request.post('/api/register', { headers: { Origin: origin, 'Content-Type': 'application/json' }, data: JSON.stringify({ name: 'x'.repeat(10000) }) })
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
  const result = page.waitForResponse(response => response.url().endsWith('/api/admin/draw') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Sortear agora' }).click()
  const saved = await (await result).json()
  expect(saved.animationNames.length).toBeGreaterThan(0)
  expect(saved.animationNames.every((name: string) => !name.includes(' '))).toBe(true)
  expect(saved.animationNames).not.toContain('Ana')
  await expect(page.locator('.name-reel')).toBeVisible()
  await page.reload()
  await expect(page.locator('.stage-book-caption h2')).toHaveText('Toda a Escritura é…')
  await expect(page.getByText('ESSE LIVRO É SEU!')).toBeVisible({ timeout: 10000 })
  const winner = await page.locator('.winner-name').innerText()
  expect(winner).toBe(saved.name)
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

test('reset exige autenticação e confirmação, apaga testes e invalida abas e recibos antigos', async ({ page, request }) => {
  const body = { confirmation: 'APAGAR TESTES', generation: 1, total: 5, winners: 2 }
  expect((await request.post('/api/admin/reset', { headers: { Origin: origin }, data: body })).status()).toBe(401)
  expect((await request.post('/api/admin/reset', { headers: { Origin: 'https://malicioso.example' }, data: body })).status()).toBe(403)
  await page.goto('/admin/login')
  await page.getByLabel('E-mail', { exact: true }).fill('dev@dodopok.dev')
  await page.getByLabel('Senha').fill('reb-local-test-Only-2026!')
  await page.getByRole('button', { name: 'Entrar no painel' }).click()
  await expect(page).toHaveURL('/admin')
  expect((await page.request.post('/api/admin/reset', { headers: { Origin: origin }, data: { ...body, confirmation: 'apagar' } })).status()).toBe(400)
  await page.evaluate(() => localStorage.setItem('reb-2026-received', '1'))
  await page.getByRole('button', { name: 'Apagar testes e zerar' }).click()
  const confirm = page.getByRole('button', { name: 'Apagar e zerar', exact: true })
  await expect(confirm).toBeDisabled()
  await page.getByLabel('Digite APAGAR TESTES para confirmar').fill('APAGAR TESTES')
  await confirm.click()
  await expect(page.getByText('Testes apagados.', { exact: false })).toBeVisible()
  const empty = await (await page.request.get('/api/admin/dashboard')).json()
  expect(empty).toMatchObject({ generation: 2, status: 'draft', total: 0, winners: [], contacts: [] })
  expect((await page.request.post('/api/admin/state', { headers: { Origin: origin }, data: { status: 'open', generation: 1 } })).status()).toBe(409)
  expect((await page.request.post('/api/admin/draw', { headers: { Origin: origin }, data: { requestId: crypto.randomUUID(), prizeId: 1, generation: 1 } })).status()).toBe(409)
  await page.getByRole('button', { name: 'Abrir inscrições', exact: true }).click()
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Quero participar do sorteio' })).toBeEnabled()
  await expect(page.getByText('INSCRIÇÃO RECEBIDA', { exact: true })).not.toBeVisible()
  expect((await page.request.post('/api/register', { headers: { Origin: origin }, data: { name: 'Maria de Fátima', email: 'maria@example.com', whatsapp: '(11) 98765-4321', adult: true, consent: true, generation: 1 } })).status()).toBe(409)
  expect((await page.request.post('/api/register', { headers: { Origin: origin }, data: { name: 'Maria de Fátima', email: 'maria@example.com', whatsapp: '(11) 98765-4321', adult: true, consent: true, generation: 2 } })).status()).toBe(200)
  expect((await (await page.request.get('/api/admin/dashboard')).json()).total).toBe(1)
  for (let i = 1; i <= 2; i++) {
    expect((await page.request.post('/api/register', { headers: { Origin: origin }, data: { name: `Pessoa Oficial ${i === 1 ? 'Um' : 'Dois'}`, email: `oficial${i}@example.com`, whatsapp: `1198765432${i + 1}`, adult: true, consent: true, generation: 2 } })).status()).toBe(200)
  }
  expect((await page.request.post('/api/admin/state', { headers: { Origin: origin }, data: { status: 'closed', generation: 2 } })).status()).toBe(200)
  await page.evaluate(() => sessionStorage.setItem('reb-pending-draw-2026', JSON.stringify({ requestId: crypto.randomUUID(), prizeId: 1, generation: 1 })))
  await page.goto('/admin/palco')
  await expect(page.getByRole('button', { name: 'Sortear agora', exact: true })).toBeVisible()
  expect((await (await page.request.get('/api/admin/dashboard')).json()).winners).toHaveLength(0)
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

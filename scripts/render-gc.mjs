import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const url = process.env.REB_PREVIEW_URL || 'http://127.0.0.1:3000'
const browser = await chromium.launch({ channel: 'chrome', args: ['--disable-gpu'] })
await mkdir('public/live', { recursive: true })
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  for (const [path, file, transparent] of [['/gc', 'gc-sorteio-1920x1080.png', true], ['/gc?modo=tela', 'convite-sorteio-1920x1080.png', false]]) {
    await page.goto(url + path, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: 'public/live/' + file, omitBackground: transparent })
    console.log('Gerado: public/live/' + file)
  }
} finally { await browser.close() }

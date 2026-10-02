import postgres from 'postgres'
import { readFile } from 'node:fs/promises'

const url = process.env.NUXT_DATABASE_URL
if (!url) throw new Error('Preencha NUXT_DATABASE_URL em .env antes de migrar.')
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} })
try {
  await sql.begin(async tx => { await tx.unsafe(await readFile(new URL('../database/001_schema.sql', import.meta.url), 'utf8')) })
  console.log('Banco pronto. As inscrições começam fechadas e são abertas pelo painel.')
} finally { await sql.end() }

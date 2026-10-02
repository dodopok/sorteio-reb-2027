import { randomBytes, scryptSync } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import readline from 'node:readline/promises'

const terminal = readline.createInterface({ input: process.stdin, output: process.stdout })
const email = (await terminal.question('E-mail do admin [dev@dodopok.dev]: ')).trim() || 'dev@dodopok.dev'
terminal.close()
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.')
const password = randomBytes(18).toString('base64url')
const salt = randomBytes(16).toString('hex')
const hash = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex')
let env = await readFile('.env', 'utf8').catch(() => '')
const values = { NUXT_ADMIN_EMAIL: email, NUXT_ADMIN_PASSWORD_HASH: `scrypt:${salt}:${hash}`, NUXT_IP_HASH_SECRET: randomBytes(32).toString('hex') }
for (const [key, value] of Object.entries(values)) {
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  env = pattern.test(env) ? env.replace(pattern, `${key}=${value}`) : env.trimEnd() + `\n${key}=${value}\n`
}
await writeFile('.env', env.trimStart(), { mode: 0o600 })
console.log('\nSenha gerada (guarde no seu gerenciador de senhas):\n' + password)
console.log('\nHash e segredo salvos em .env. Copie as variáveis para a Railway e reinicie o servidor. Não envie .env para o Git.')

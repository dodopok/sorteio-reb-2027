import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { isIP } from 'node:net'
import type { H3Event } from 'h3'

const COOKIE = 'reb_admin'
// A small local cache rejects already-blocked IPs without another DB round trip.
// PostgreSQL remains authoritative across replicas and restarts.
const blocked = new Map<string, number>()
const MAX_BLOCKED = 5000
export function requestIp(event: H3Event) {
  // Only trust the header overwritten by the deployment's own ingress.
  const ip = process.env.RAILWAY_ENVIRONMENT_ID
    ? getHeader(event, 'x-real-ip')?.trim()
    : event.node.req.socket?.remoteAddress
  return ip && isIP(ip) ? ip : 'unknown'
}

export function ipKey(event: H3Event) {
  const secret = useRuntimeConfig().ipHashSecret
  if (secret.length < 32) throw createError({ statusCode: 503, statusMessage: 'Serviço temporariamente indisponível.' })
  const ip = requestIp(event)
  // Group IPv6 by /64 so rotating interface addresses cannot bypass the limit.
  let normalized = ip
  if (isIP(ip) === 6) {
    const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1)
    const [left, right] = canonical.split('::')
    const leading = left ? left.split(':') : []
    const trailing = right ? right.split(':') : []
    const groups = right !== undefined ? [...leading, ...Array(8 - leading.length - trailing.length).fill('0'), ...trailing] : leading
    normalized = groups.slice(0, 4).map(group => group.padStart(4, '0')).join(':')
  }
  return createHmac('sha256', secret).update(normalized).digest('hex')
}

export async function rateLimit(event: H3Event, scope: string, limit: number, seconds: number) {
  const key = scope + ':' + ipKey(event)
  const blockedUntil = blocked.get(key) ?? 0
  if (blockedUntil > Date.now()) {
    setHeader(event, 'Retry-After', Math.ceil((blockedUntil - Date.now()) / 1000))
    throw createError({ statusCode: 429, statusMessage: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' })
  }
  blocked.delete(key)
  let rows
  try { rows = await db()`SELECT * FROM reb_rate_limit(${key}, ${limit}, ${seconds})` }
  catch (error) { if ((error as { statusCode?: number }).statusCode) throw error; databaseError(error) }
  if (!rows[0]?.allowed) {
    const retryAfter = Number(rows[0]?.retry_after ?? seconds)
    if (blocked.size >= MAX_BLOCKED) blocked.delete(blocked.keys().next().value!)
    blocked.set(key, Date.now() + retryAfter * 1000)
    setHeader(event, 'Retry-After', retryAfter)
    throw createError({ statusCode: 429, statusMessage: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' })
  }
}

export function assertOrigin(event: H3Event) {
  const origin = getHeader(event, 'origin')
  const allowed = new Set([new URL(useRuntimeConfig().public.siteUrl).origin])
  if (process.env.RAILWAY_PUBLIC_DOMAIN) allowed.add(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`)
  if (import.meta.dev) allowed.add('http://127.0.0.1:3000')
  if (!origin || !allowed.has(origin) || getHeader(event, 'sec-fetch-site') === 'cross-site') {
    throw createError({ statusCode: 403, statusMessage: 'Recarregue a página para continuar.' })
  }
  if (!getHeader(event, 'content-type')?.startsWith('application/json')) {
    throw createError({ statusCode: 415, statusMessage: 'Formato de solicitação inválido.' })
  }
}

export async function limitedBody(event: H3Event) {
  const length = Number(getHeader(event, 'content-length') || 0)
  if (length > 8192) throw createError({ statusCode: 413, statusMessage: 'Solicitação muito grande.' })
  // Check the stream too: Content-Length is not trustworthy and may be absent.
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of event.node.req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buffer.length
    if (bytes > 8192) throw createError({ statusCode: 413, statusMessage: 'Solicitação muito grande.' })
    chunks.push(buffer)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw createError({ statusCode: 400, statusMessage: 'Solicitação inválida.' }) }
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, hash] = stored.split(':')
  if (algorithm !== 'scrypt' || !salt || !hash || !/^[a-f0-9]{128}$/.test(hash)) return false
  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, key) => err ? reject(err) : resolve(key))
  })
  return timingSafeEqual(Buffer.from(hash, 'hex'), derived)
}

export async function createAdminSession(event: H3Event) {
  const token = randomBytes(32).toString('base64url')
  const hash = createHash('sha256').update(token).digest('hex')
  await db()`INSERT INTO reb_sessions (token_hash, expires_at) VALUES (${hash}, now() + interval '8 hours')`
  setCookie(event, COOKIE, token, { httpOnly: true, secure: !import.meta.dev, sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 })
}

export async function requireAdmin(event: H3Event) {
  const token = getCookie(event, COOKIE)
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
    const hash = createHash('sha256').update(token).digest('hex')
    let rows
    try { rows = await db()`SELECT token_hash FROM reb_sessions WHERE token_hash = ${hash} AND expires_at > now()` }
    catch (error) { databaseError(error) }
    if (rows.length) return hash
  }
  throw createError({ statusCode: 401, statusMessage: 'Entre novamente para continuar.' })
}

export async function endSession(event: H3Event) {
  const hash = await requireAdmin(event)
  await db()`DELETE FROM reb_sessions WHERE token_hash = ${hash}`
  deleteCookie(event, COOKIE, { path: '/', secure: !import.meta.dev, httpOnly: true, sameSite: 'strict' })
}

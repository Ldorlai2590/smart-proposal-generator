import { z } from 'zod'
import { signSession, setSessionCookie } from '@/lib/auth-jwt'

// RFC-5321 practical upper bound for an email address.
const MAX_EMAIL_LEN = 254
const MAX_PASSWORD_LEN = 128
const MIN_PASSWORD_LEN = 6

// Blocked email patterns — obvious abuse / throwaway / privileged-looking identities.
// Matched case-insensitively against the normalized (lowercased) email.
const BLOCKED_EMAIL_PATTERNS: RegExp[] = [
  /^test@test\b/i,
  /^a@b\.c$/i,
  /^admin@/i,
  /^root@/i,
]

// Blocked passwords — trivially guessable. Matched on exact (case-sensitive) value.
const BLOCKED_PASSWORDS = new Set<string>([
  '123456',
  'password',
  'qwerty',
  'abc123',
])

const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3)
    .max(MAX_EMAIL_LEN)
    .email('Formato de correo inválido'),
  password: z
    .string()
    .min(MIN_PASSWORD_LEN, 'La contraseña debe tener al menos 6 caracteres')
    .max(MAX_PASSWORD_LEN, 'La contraseña es demasiado larga'),
})

// --- In-memory rate limiter -------------------------------------------------
// Keyed by client IP. Sliding 60s window, 5 failed attempts max.
// NOTE: in-memory store only — per-instance. Behind a load balancer each replica
// tracks its own counters. Acceptable for demo; a production deployment should
// back this with Redis / Upstash / similar.
const RL_WINDOW_MS = 60_000
const RL_MAX_ATTEMPTS = 5
const RL_CLEAN_INTERVAL = 5 * 60_000

type AttemptRecord = { count: number; windowStart: number }
const failedLoginAttempts = new Map<string, AttemptRecord>()

let lastCleanup = Date.now()
function pruneStale(now: number) {
  if (now - lastCleanup < RL_CLEAN_INTERVAL) return
  lastCleanup = now
  for (const [ip, rec] of failedLoginAttempts) {
    if (now - rec.windowStart > RL_WINDOW_MS) {
      failedLoginAttempts.delete(ip)
    }
  }
}

function getClientIp(req: Request): string {
  const h = req.headers
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = h.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

function checkRateLimit(ip: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now()
  pruneStale(now)
  const rec = failedLoginAttempts.get(ip)
  if (!rec) return { ok: true }
  if (now - rec.windowStart > RL_WINDOW_MS) {
    failedLoginAttempts.delete(ip)
    return { ok: true }
  }
  if (rec.count >= RL_MAX_ATTEMPTS) {
    const retryAfter = Math.max(1, Math.ceil((RL_WINDOW_MS - (now - rec.windowStart)) / 1000))
    return { ok: false, retryAfter }
  }
  return { ok: true }
}

function recordFailure(ip: string) {
  const now = Date.now()
  const rec = failedLoginAttempts.get(ip)
  if (!rec || now - rec.windowStart > RL_WINDOW_MS) {
    failedLoginAttempts.set(ip, { count: 1, windowStart: now })
    return
  }
  rec.count += 1
}

function clearFailures(ip: string) {
  failedLoginAttempts.delete(ip)
}

function isBlockedEmail(email: string): boolean {
  return BLOCKED_EMAIL_PATTERNS.some((re) => re.test(email))
}

function isBlockedPassword(pw: string): boolean {
  return BLOCKED_PASSWORDS.has(pw)
}

function deriveName(email: string): string {
  const localPart = email.split('@')[0] ?? ''
  return (
    localPart
      .split(/[._-]/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ') || 'Usuario'
  )
}

export async function POST(req: Request) {
  const ip = getClientIp(req)

  // 1. Rate limit gate (applies before any expensive work).
  const rl = checkRateLimit(ip)
  if (!rl.ok) {
    return Response.json(
      { error: 'Demasiados intentos, espera 60 segundos' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  // 2. Parse JSON — isolated try/catch so malformed bodies yield 400 not 500.
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 })
  }

  // 3. Schema validation.
  const parsed = LoginSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return Response.json(
      { error: first?.message ?? 'Datos inválidos' },
      { status: 400 }
    )
  }

  const email = parsed.data.email.toLowerCase()
  const password = parsed.data.password

  // 4. Blocked patterns — count as failed attempts so abuse burns the RL budget.
  if (isBlockedEmail(email)) {
    recordFailure(ip)
    return Response.json(
      { error: 'Correo no permitido' },
      { status: 400 }
    )
  }
  if (isBlockedPassword(password)) {
    recordFailure(ip)
    return Response.json(
      { error: 'Contraseña demasiado común, elige una más segura' },
      { status: 400 }
    )
  }

  // 5. Issue session.
  try {
    const name = deriveName(email)
    const token = await signSession({ email, name, orgId: 'demo' })
    await setSessionCookie(token)
    clearFailures(ip)
    return Response.json({
      success: true,
      user: { email, name, orgId: 'demo' },
    })
  } catch (err) {
    console.error('[api/auth/login]', err)
    recordFailure(ip)
    return Response.json({ error: 'Error de autenticación' }, { status: 500 })
  }
}

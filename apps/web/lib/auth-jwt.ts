import { SignJWT, jwtVerify } from 'jose'
import { cookies, headers } from 'next/headers'
import { randomBytes } from 'crypto'

const SESSION_COOKIE = 'spg-session'
const SESSION_DURATION = 60 * 60 * 24 * 7 // 7 days
const JWT_ISSUER = 'smart-proposal-generator'
const JWT_AUDIENCE = 'spg-web'
const MIN_SECRET_BYTES = 32

/**
 * Resolve the JWT secret with fail-fast semantics.
 *
 * Rules:
 *  - If JWT_SECRET env var is set, it MUST be at least 32 bytes (utf-8).
 *  - If JWT_SECRET is missing AND DEMO_MODE !== 'true' -> throw. Production must not run
 *    without an explicit secret.
 *  - If JWT_SECRET is missing AND DEMO_MODE === 'true' -> synthesize a cryptographically
 *    strong per-boot secret (32 bytes, hex-encoded). Log ONE warning. Sessions will not
 *    survive a restart — this is acceptable for demo/ephemeral environments only.
 *
 * The secret is cached at module load to avoid regenerating per-request.
 */
function resolveJwtSecret(): Uint8Array {
  const envSecret = process.env.JWT_SECRET
  const demoMode = process.env.DEMO_MODE === 'true'

  if (envSecret && envSecret.length > 0) {
    const bytes = new TextEncoder().encode(envSecret)
    if (bytes.byteLength < MIN_SECRET_BYTES) {
      throw new Error(
        `JWT_SECRET must be at least ${MIN_SECRET_BYTES} bytes (got ${bytes.byteLength}). Use a strong random secret.`
      )
    }
    return bytes
  }

  if (!demoMode) {
    throw new Error('JWT_SECRET env var is required')
  }

  // Demo mode fallback: ephemeral per-boot secret.
  const generated = randomBytes(32).toString('hex')
  // eslint-disable-next-line no-console
  console.warn(
    '[auth-jwt] WARN: JWT_SECRET not set. DEMO_MODE=true detected — using an ephemeral per-boot secret. Sessions will be invalidated on restart. Do NOT use this in production.'
  )
  return new TextEncoder().encode(generated)
}

let _secretKey: Uint8Array | null = null
function getSecretKey(): Uint8Array {
  if (!_secretKey) _secretKey = resolveJwtSecret()
  return _secretKey
}

export interface SessionPayload {
  email: string
  name: string
  orgId: string
  loginAt: number
}

export async function signSession(payload: Omit<SessionPayload, 'loginAt'>): Promise<string> {
  return await new SignJWT({ ...payload, loginAt: Date.now() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey())
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

/**
 * Detect whether the current request is being served over HTTPS. In production we
 * always set Secure (assume TLS terminated upstream). In dev we honor x-forwarded-proto.
 */
async function isSecureRequest(): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') return true
  try {
    const h = await headers()
    const proto = h.get('x-forwarded-proto') ?? h.get('x-forwarded-protocol')
    if (proto && proto.split(',')[0].trim().toLowerCase() === 'https') return true
  } catch {
    // headers() may not be available in some contexts (e.g. route handlers outside req scope)
  }
  return false
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  const secure = await isSecureRequest()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: SESSION_DURATION,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}

export { SESSION_COOKIE, JWT_ISSUER, JWT_AUDIENCE }

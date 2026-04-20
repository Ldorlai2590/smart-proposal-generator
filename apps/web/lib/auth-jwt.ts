import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET ?? 'demo-secret-key-change-in-production-please-12345678'
const SESSION_COOKIE = 'spg-session'
const SESSION_DURATION = 60 * 60 * 24 * 7 // 7 days

export interface SessionPayload {
  email: string
  name: string
  orgId: string
  loginAt: number
}

const encoder = new TextEncoder()
const secretKey = encoder.encode(JWT_SECRET)

export async function signSession(payload: Omit<SessionPayload, 'loginAt'>): Promise<string> {
  return await new SignJWT({ ...payload, loginAt: Date.now() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey)
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
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

export { SESSION_COOKIE }

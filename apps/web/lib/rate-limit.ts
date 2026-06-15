/**
 * Redis-backed fixed-window rate limiter via Upstash.
 *
 * Shared across all Vercel Function instances — global enforcement.
 * Uses INCR + EXPIRE per (ip, key) composite key.
 *
 * Fallback: if env vars are missing (local dev without Redis), returns
 * allowed:true with a warning so the app still works.
 */
import { Redis } from '@upstash/redis'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  /** Seconds until window resets. 0 when allowed. */
  retryAfter: number
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export async function checkLimit(
  ip: string,
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const redis = getRedis()
  const resetAt = new Date(Date.now() + windowSec * 1000)

  if (!redis) {
    console.warn('[rate-limit] UPSTASH_REDIS_REST_URL not set — rate limiting disabled')
    return { allowed: true, remaining: limit - 1, resetAt, retryAfter: 0 }
  }

  const compositeKey = `rl:${ip}:${key}`

  // Only set the TTL when the key is newly created (INCR returns 1). Calling
  // EXPIRE unconditionally would reset the window on every request, so it would
  // never roll over and an attacker pacing just under the window is never limited.
  const count = await redis.incr(compositeKey)
  if (count === 1) await redis.expire(compositeKey, windowSec)

  if (count > limit) {
    return { allowed: false, remaining: 0, resetAt, retryAfter: windowSec }
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - count),
    resetAt,
    retryAfter: 0,
  }
}

/**
 * Best-effort client IP extraction for Next.js App Router Request.
 *
 * Prefers `x-real-ip` (injected by the Vercel edge, not client-controllable).
 * Falls back to the LAST non-empty entry of `x-forwarded-for` — the first
 * entries are client-supplied and therefore spoofable, while the proxy appends
 * the real upstream IP at the end. Finally falls back to 'unknown'.
 */
export function getClientIp(req: Request): string {
  const xri = req.headers.get('x-real-ip')
  if (xri) {
    const trimmed = xri.trim()
    if (trimmed) return trimmed
  }
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean)
    const last = parts[parts.length - 1]
    if (last) return last
  }
  return 'unknown'
}

/** Test-only helper — no-op with Redis backend. */
export function __resetRateLimitStoreForTests(): void {}

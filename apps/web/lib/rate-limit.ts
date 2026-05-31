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

  const pipeline = redis.pipeline()
  pipeline.incr(compositeKey)
  pipeline.expire(compositeKey, windowSec)
  const results = await pipeline.exec() as [number, number]
  const count = results[0]

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
 * Priority: x-forwarded-for → x-real-ip → cf-connecting-ip → 'unknown'
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const xri = req.headers.get('x-real-ip')
  if (xri) return xri.trim()
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  return 'unknown'
}

/** Test-only helper — no-op with Redis backend. */
export function __resetRateLimitStoreForTests(): void {}

/**
 * In-memory sliding-window rate limiter.
 *
 * Why sliding window (vs token bucket / fixed window)?
 *  - Fixed window allows 2x burst at window boundaries (e.g. 3 requests at
 *    t=4:59 and 3 more at t=5:00 → 6 in 1 second with a "3 per 5 min" rule).
 *  - Token bucket is great for smoothing bursts but adds complexity around
 *    refill rates that we don't need here.
 *  - Sliding window with a stored timestamp list gives exact per-IP counts
 *    over the last N seconds — simple, correct, and fine for the small-N
 *    traffic of a DEMO endpoint. Memory stays O(limit) per key.
 *
 * Scope: this lives in the Node process and is NOT shared across instances.
 *  - On Vercel/serverless that means each cold lambda has its own counter.
 *  - For DEMO rate-limiting that's acceptable (worst case: attacker hits
 *    multiple cold instances and gets slightly more than `limit`).
 *  - For production-grade global limits, swap this for Upstash Redis or
 *    Vercel KV with the same `checkLimit` shape.
 *
 * API:
 *   const { allowed, remaining, resetAt, retryAfter } =
 *     checkLimit(ip, 'proposals:stream', 3, 300)
 *
 *   if (!allowed) return 429 with Retry-After
 */

interface Entry {
  // Unix ms timestamps of recent requests inside the window.
  timestamps: number[]
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  /** Seconds until the oldest hit ages out of the window. 0 when allowed. */
  retryAfter: number
}

// Module-level state. Survives between requests within a single Node process.
const store = new Map<string, Entry>()

// Cleanup bookkeeping — avoid doing O(N) sweeps on every single request.
let lastSweep = 0
const SWEEP_INTERVAL_MS = 60_000 // sweep at most once a minute

/**
 * Evict any key whose newest timestamp is older than 2×window. This keeps the
 * Map from growing unboundedly if many unique IPs hit the service once and
 * never come back. We use 2× as a safety margin vs exactly `windowSec`.
 */
function maybeSweep(nowMs: number, windowMs: number): void {
  if (nowMs - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = nowMs
  const cutoff = nowMs - windowMs * 2
  for (const [key, entry] of store) {
    const newest = entry.timestamps[entry.timestamps.length - 1] ?? 0
    if (newest < cutoff) store.delete(key)
  }
}

/**
 * Check and record a request against a sliding window.
 * NOTE: this mutates the store (records the attempt) when `allowed` is true.
 * Rejected requests do NOT count toward the window (matches user expectations
 * — getting 429'd shouldn't extend your own timeout).
 */
export function checkLimit(
  ip: string,
  key: string,
  limit: number,
  windowSec: number,
): RateLimitResult {
  const now = Date.now()
  const windowMs = windowSec * 1000
  const cutoff = now - windowMs
  const compositeKey = `${ip}::${key}`

  maybeSweep(now, windowMs)

  const entry = store.get(compositeKey) ?? { timestamps: [] }

  // Drop timestamps that fell out of the window.
  // Timestamps are appended in order, so a single linear scan + slice works.
  let firstInWindow = 0
  while (firstInWindow < entry.timestamps.length && entry.timestamps[firstInWindow] <= cutoff) {
    firstInWindow++
  }
  if (firstInWindow > 0) entry.timestamps = entry.timestamps.slice(firstInWindow)

  if (entry.timestamps.length >= limit) {
    // Oldest still-valid hit determines when we'll have a slot free.
    const oldest = entry.timestamps[0]
    const resetMs = oldest + windowMs
    store.set(compositeKey, entry)
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(resetMs),
      retryAfter: Math.max(1, Math.ceil((resetMs - now) / 1000)),
    }
  }

  entry.timestamps.push(now)
  store.set(compositeKey, entry)

  const resetMs = entry.timestamps[0] + windowMs
  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.timestamps.length),
    resetAt: new Date(resetMs),
    retryAfter: 0,
  }
}

/**
 * Best-effort client IP extraction for Next.js App Router Request.
 *
 * Priority:
 *   1. x-forwarded-for (first entry) — standard proxy header.
 *   2. x-real-ip — nginx / some CDNs.
 *   3. cf-connecting-ip — Cloudflare.
 *   4. 'unknown' — fall back; rate limiting still works per-unknown-bucket,
 *      which is safer than failing open.
 *
 * We do NOT trust these headers in a zero-trust sense; they're set by the
 * edge proxy in front of Vercel. If the app is ever deployed without such a
 * proxy, swap in the socket-level peer address.
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

/** Test-only helper. Not exported publicly elsewhere. */
export function __resetRateLimitStoreForTests(): void {
  store.clear()
  lastSweep = 0
}

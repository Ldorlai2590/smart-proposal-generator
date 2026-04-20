/**
 * Simple structured JSON logger — zero external deps.
 *
 * Design goals:
 *  - One JSON object per log line (easy to ingest in Vercel/Datadog/Loki).
 *  - Prefix every message with `[DEMO]` when DEMO_MODE=true so you can
 *    visually distinguish throwaway traffic from production traffic in
 *    the same log stream.
 *  - No PII helpers here — callers are responsible for not passing tokens,
 *    raw passwords, or full DATABASE_URLs in the context object.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('login', { email: user.email })
 *   logger.error('db_unreachable', { err: String(e) })
 *
 *   // Per-request child logger with a correlation id:
 *   const log = logger.withRequestId(req)
 *   log.info('stream_start', { clientId })
 */

type Level = 'info' | 'warn' | 'error'

type Context = Record<string, unknown>

const isDemo = (): boolean => process.env.DEMO_MODE === 'true'

function emit(level: Level, message: string, context?: Context): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message: isDemo() ? `[DEMO] ${message}` : message,
    ...(context ?? {}),
  }
  const line = JSON.stringify(payload)
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line)
  } else {
    // eslint-disable-next-line no-console
    console.log(line)
  }
}

export interface Logger {
  info: (message: string, context?: Context) => void
  warn: (message: string, context?: Context) => void
  error: (message: string, context?: Context) => void
  child: (extra: Context) => Logger
  withRequestId: (req: Request) => Logger
}

function makeLogger(base: Context = {}): Logger {
  const merge = (ctx?: Context): Context => ({ ...base, ...(ctx ?? {}) })
  return {
    info: (msg, ctx) => emit('info', msg, merge(ctx)),
    warn: (msg, ctx) => emit('warn', msg, merge(ctx)),
    error: (msg, ctx) => emit('error', msg, merge(ctx)),
    child: (extra) => makeLogger({ ...base, ...extra }),
    withRequestId: (req: Request) => {
      // Prefer an upstream correlation id if present (Vercel adds one).
      const fromHeader =
        req.headers.get('x-request-id') ??
        req.headers.get('x-vercel-id') ??
        null
      const requestId =
        fromHeader ??
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`)
      return makeLogger({ ...base, requestId })
    },
  }
}

export const logger: Logger = makeLogger()

/**
 * Convenience: build a per-request logger with requestId prefilled.
 * Equivalent to `logger.withRequestId(req)`.
 */
export function withRequestId(req: Request): Logger {
  return logger.withRequestId(req)
}

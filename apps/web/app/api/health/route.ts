import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

/**
 * Health endpoint.
 *
 * Security notes:
 *  - We never return the DATABASE_URL. Only a boolean `set` / `NOT SET` so
 *    attackers can't scrape internal hostnames, IPs, users, or passwords.
 *  - DB errors are reduced to `'unreachable'`. Raw driver errors routinely
 *    contain host/port/user in the message; those stay in server logs only.
 *  - In DEMO_MODE we skip the DB round-trip entirely. The demo deployment
 *    uses a dummy connection string and probing it would leak the failure
 *    string and waste ~5s per request.
 */
export async function GET(req: Request) {
  const log = logger.withRequestId(req)

  const envCheck = {
    DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'NOT SET',
    DEMO_MODE: process.env.DEMO_MODE ?? 'NOT SET',
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE ?? 'NOT SET',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'set' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV ?? 'NOT SET',
  }

  let dbStatus: string
  if (DEMO_MODE) {
    dbStatus = 'skipped (demo mode)'
  } else if (!process.env.DATABASE_URL) {
    dbStatus = 'skipped (no DATABASE_URL)'
  } else {
    try {
      const postgres = (await import('postgres')).default
      const sql = postgres(process.env.DATABASE_URL, {
        prepare: false,
        ssl: 'require',
        connect_timeout: 5,
      })
      try {
        const result = await sql`SELECT count(*) as n FROM tenants`
        dbStatus = `connected - ${result[0].n} tenants`
      } finally {
        // Always release the connection, even on query failure.
        await sql.end({ timeout: 2 }).catch(() => {})
      }
    } catch (e: unknown) {
      // Log the real error server-side for ops, return a sanitized string.
      log.error('health_db_unreachable', {
        err: e instanceof Error ? e.message : String(e),
      })
      dbStatus = 'unreachable'
    }
  }

  return Response.json({
    envCheck,
    dbStatus,
    demoMode: DEMO_MODE,
    timestamp: new Date().toISOString(),
  })
}

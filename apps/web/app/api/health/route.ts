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

  // Internal-only diagnostics — never expose to public callers.
  // We log them server-side for on-call visibility but strip them from the response.
  log.info('health_env_check', {
    DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'NOT SET',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'set' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV ?? 'NOT SET',
  })

  // Health check usa Supabase REST (mismo camino que la app real).
  // El postgres directo no se usa en runtime — Drizzle se migró a REST
  // porque Vercel tenía problemas de conectividad TCP a Supabase pooler.
  let dbStatus: string
  if (DEMO_MODE) {
    dbStatus = 'skipped (demo mode)'
  } else if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    dbStatus = 'skipped (no Supabase config)'
  } else {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()
      const { count, error } = await admin
        .from('tenants')
        .select('*', { count: 'exact', head: true })
      if (error) throw new Error(error.message)
      dbStatus = count !== null ? 'connected' : 'connected'
    } catch (e: unknown) {
      log.error('health_db_unreachable', {
        err: e instanceof Error ? e.message : String(e),
      })
      dbStatus = 'unreachable'
    }
  }

  return Response.json({
    status: 'ok',
    dbStatus,
    timestamp: new Date().toISOString(),
  })
}

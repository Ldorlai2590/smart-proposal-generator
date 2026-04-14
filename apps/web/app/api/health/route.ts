export const dynamic = 'force-dynamic'

export async function GET() {
  const envCheck = {
    DATABASE_URL: process.env.DATABASE_URL ? `set (${process.env.DATABASE_URL.substring(0, 20)}...)` : 'NOT SET',
    DEMO_MODE: process.env.DEMO_MODE ?? 'NOT SET',
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE ?? 'NOT SET',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'set' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV ?? 'NOT SET',
  }

  // Try DB connection if DATABASE_URL is set
  let dbStatus = 'skipped'
  if (process.env.DATABASE_URL) {
    try {
      const postgres = (await import('postgres')).default
      const sql = postgres(process.env.DATABASE_URL, { prepare: false, ssl: 'require', connect_timeout: 5 })
      const result = await sql`SELECT count(*) as n FROM tenants`
      dbStatus = `connected - ${result[0].n} tenants`
      await sql.end()
    } catch (e: unknown) {
      dbStatus = `error: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  return Response.json({ envCheck, dbStatus, timestamp: new Date().toISOString() })
}

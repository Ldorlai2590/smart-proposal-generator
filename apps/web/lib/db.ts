import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'

// Lazy initialization — don't crash at module load in DEMO_MODE if DATABASE_URL is unreachable
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    const client = postgres(process.env.DATABASE_URL, { prepare: false, ssl: 'require' })
    _db = drizzle(client, { schema })
  }
  return _db
}

// Proxy that lazy-initializes on first property access
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

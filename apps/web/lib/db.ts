import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Direct connection to Supabase — SSL required, prepare disabled for compatibility
const client = postgres(process.env.DATABASE_URL, { prepare: false, ssl: 'require' })

export const db = drizzle(client, { schema })

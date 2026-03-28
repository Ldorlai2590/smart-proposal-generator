import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DIRECT_URL!

// Para queries (pooled en producción)
const client = postgres(connectionString, { prepare: false })
export const db = drizzle(client)

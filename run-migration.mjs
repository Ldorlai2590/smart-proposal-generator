import postgres from './apps/web/node_modules/postgres/cjs/src/index.js'
import { readFileSync } from 'fs'

const db = postgres('postgresql://postgres:Luis_3412freyja@db.tdlubcexihadecfbijir.supabase.co:5432/postgres', {
  ssl: 'require',
  max: 1,
})

const sql = readFileSync('./apps/web/db/migrations/003_demo_ready.sql', 'utf8')

console.log('Running migration 003_demo_ready.sql...')
try {
  await db.unsafe(sql)
  console.log('✅ Migration completed successfully')
} catch (err) {
  console.error('❌ Error:', err.message)
} finally {
  await db.end()
}

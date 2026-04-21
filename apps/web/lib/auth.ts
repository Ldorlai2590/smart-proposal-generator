import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { tenants, users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthenticated')

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.supabaseUserId, user.id),
  })

  if (!tenant) throw new Error('Tenant not found')

  return { userId: user.id, tenantId: tenant.id, email: user.email ?? '' }
}

export async function getTenantId(): Promise<string> {
  const { tenantId } = await requireAuth()
  return tenantId
}

export async function getApiHeaders(): Promise<HeadersInit> {
  const { tenantId } = await requireAuth()
  return {
    'X-Tenant-ID': tenantId,
    'Content-Type': 'application/json',
  }
}

/**
 * Creates tenant + user records on first login if they don't exist yet.
 * Called from the dashboard layout and the auth callback.
 */
export async function ensureTenant(supabaseUserId: string, email: string): Promise<string> {
  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.supabaseUserId, supabaseUserId),
  })

  if (existing) return existing.id

  const name = email.split('@')[0]?.replace(/[._-]/g, ' ') ?? 'Mi Empresa'
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const [tenant] = await db
    .insert(tenants)
    .values({ supabaseUserId, name, trialEndsAt })
    .returning()

  await db.insert(users).values({
    tenantId: tenant.id,
    supabaseUserId,
    email,
    role: 'owner',
  })

  return tenant.id
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthenticated')

  const admin = createAdminClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('id')
    .eq('supabase_user_id', user.id)
    .maybeSingle()

  if (!tenant) throw new Error('Tenant not found')

  return { userId: user.id, tenantId: tenant.id as string, email: user.email ?? '' }
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

export async function ensureTenant(supabaseUserId: string, email: string): Promise<string> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('tenants')
    .select('id')
    .eq('supabase_user_id', supabaseUserId)
    .maybeSingle()

  if (existing) return existing.id as string

  const name = email.split('@')[0]?.replace(/[._-]/g, ' ') ?? 'Mi Empresa'
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const { data: tenant, error: tErr } = await admin
    .from('tenants')
    .insert({
      supabase_user_id: supabaseUserId,
      name,
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select('id')
    .single()

  if (tErr || !tenant) throw new Error(`Failed to create tenant: ${tErr?.message}`)

  await admin.from('users').insert({
    tenant_id: tenant.id,
    supabase_user_id: supabaseUserId,
    email,
    role: 'owner',
  })

  return tenant.id as string
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ authenticated: false }, { status: 401 })
  }

  // Look up tenantId without throwing if tenant doesn't exist yet
  let tenantId: string | null = null
  try {
    const admin = createAdminClient()
    const { data: tenant } = await admin
      .from('tenants')
      .select('id')
      .eq('supabase_user_id', user.id)
      .maybeSingle()
    tenantId = tenant?.id ?? null
  } catch {
    // Non-fatal: tenantId remains null (e.g. during onboarding)
  }

  return Response.json({
    authenticated: true,
    tenantId,
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? user.email?.split('@')[0],
    },
  })
}

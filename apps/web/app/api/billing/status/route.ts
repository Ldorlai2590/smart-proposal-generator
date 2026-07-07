import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/status — trial/subscription state for the current tenant.
 *
 * Reads the tenants row via the Supabase REST admin client (the proven-reliable
 * path on Vercel). lib/trial.ts's getTrialStatus uses Drizzle/postgres over TCP,
 * which the health route documents as unreliable on Vercel — so the billing page,
 * which polls this endpoint, must not depend on it. Lazy expiration is computed
 * here the same way getTrialStatus does.
 */
export async function GET() {
  let tenantId: string
  try {
    tenantId = (await requireAuth()).tenantId
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('tenants')
      .select('trial_ends_at, trial_stage, card_on_file, plan, proposals_used, proposals_quota')
      .eq('id', tenantId)
      .maybeSingle()

    if (error || !data) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const endMs = new Date(data.trial_ends_at as string).getTime()
    const msLeft = endMs - Date.now()
    const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)))

    let stage = (data.trial_stage as string) ?? 'no_card'
    if (stage !== 'active' && msLeft <= 0) stage = 'expired'

    return Response.json({
      stage,
      daysLeft,
      trialEndsAt: new Date(data.trial_ends_at as string).toISOString(),
      plan: (data.plan as string) ?? 'free',
      proposalsUsed: (data.proposals_used as number) ?? 0,
      proposalsQuota: (data.proposals_quota as number) ?? 0,
      cardOnFile: (data.card_on_file as boolean) ?? false,
    })
  } catch (err) {
    console.error('[billing/status] failed:', err instanceof Error ? err.message : String(err))
    return Response.json({ error: 'Failed to load billing status' }, { status: 500 })
  }
}

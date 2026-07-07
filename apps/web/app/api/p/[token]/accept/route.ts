import { createAdminClient } from '@/lib/supabase/admin'

// Public accept action for a shared proposal. Capability-based: whoever holds the
// unguessable proposal UUID (the recipient) can mark it accepted.
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  // Demo tokens: acknowledge without persisting.
  if (!UUID_RE.test(token)) {
    return Response.json({ ok: true, demo: true })
  }

  try {
    const admin = createAdminClient()
    const { data: proposal, error } = await admin
      .from('proposals')
      .select('id, status')
      .eq('id', token)
      .maybeSingle()

    if (error || !proposal) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }

    if (proposal.status !== 'accepted') {
      await admin
        .from('proposals')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', token)
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[api/p/accept] failed:', err instanceof Error ? err.message : String(err))
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}

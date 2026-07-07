import { createAdminClient } from '@/lib/supabase/admin'
import { DEMO_TRACKED, DEMO_COMPANY } from '@/lib/demo-v2'

// Public, unauthenticated endpoint that backs the shareable proposal link
// (/p/[token]). Access is capability-based: a real proposal is addressed by its
// unguessable UUID. Demo share tokens keep working for the sample links.
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  // Backward-compat: the six curated demo tokens.
  const demo = DEMO_TRACKED.find((p) => p.share_token === token)
  if (demo) {
    return Response.json({
      proposal: {
        title: demo.title,
        client_name: demo.client_name,
        sections: demo.sections ?? {},
        sent_at: demo.sent_at ?? null,
        budget: demo.budget ?? null,
      },
      company: {
        name: DEMO_COMPANY.name,
        country: DEMO_COMPANY.country,
        email: DEMO_COMPANY.email,
        phone: DEMO_COMPANY.phone,
      },
    })
  }

  // Real proposals are shared by their UUID.
  if (!UUID_RE.test(token)) {
    return Response.json({ error: 'not_found' }, { status: 404 })
  }

  try {
    const admin = createAdminClient()
    const { data: proposal, error } = await admin
      .from('proposals')
      .select('id, tenant_id, title, status, sections, context, created_at, updated_at, clients(name, company)')
      .eq('id', token)
      .maybeSingle()

    if (error || !proposal) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }

    const { data: tenant } = await admin
      .from('tenants')
      .select('name, metadata')
      .eq('id', proposal.tenant_id)
      .maybeSingle()

    const meta = (tenant?.metadata as Record<string, unknown> | null) ?? {}
    const clientRel = proposal.clients as unknown
    const client = Array.isArray(clientRel) ? clientRel[0] : clientRel
    const clientName =
      (client?.company as string) || (client?.name as string) || 'Cliente'

    return Response.json({
      proposal: {
        title: proposal.title ?? 'Propuesta Comercial',
        client_name: clientName,
        sections: proposal.sections ?? {},
        sent_at: (proposal.updated_at as string) ?? (proposal.created_at as string) ?? null,
        // context.budget is a free-text string in the wizard; don't coerce it into
        // the numeric currency formatter — omit unless it's a real number.
        budget: null as number | null,
      },
      company: {
        name: (tenant?.name as string) || DEMO_COMPANY.name,
        country: (meta.country as string) || '',
        email: (meta.email as string) || '',
        phone: (meta.phone as string) || '',
      },
    })
  } catch (err) {
    console.error('[api/p] failed:', err instanceof Error ? err.message : String(err))
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}

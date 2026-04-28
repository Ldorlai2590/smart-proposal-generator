import { z } from 'zod/v4'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

const StatusEnum = z.enum(['draft', 'generating', 'generated', 'sent', 'accepted', 'rejected'])

const NewProposalSchema = z.object({
  title: z.string().max(500).nullable().optional(),
  client_id: z.string().min(1, 'client_id is required').max(200),
  // context object holds problema (max 2000), objectives (max 1000), current_problems (max 1000)
  // sections holds 14 HTML sections, each max ~10000 chars (Claude output)
  status: StatusEnum.optional(),
  template_id: z.string().nullable().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  sections: z.record(z.string(), z.string()).optional(),
  tokens_used: z.number().int().nonnegative().optional(),
  model: z.string().max(100).nullable().optional(),
})

export async function GET() {
  try {
    const { tenantId } = await requireAuth()
    const admin = createAdminClient()

    const { data: rows, error } = await admin
      .from('proposals')
      .select('*, clients(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw new Error(error.message)

    const data = (rows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      client_id: (r.clients as { name?: string } | null)?.name ?? r.client_id,
      created_at: r.created_at ?? new Date().toISOString(),
      updated_at: r.updated_at ?? new Date().toISOString(),
      context: (r.context as Record<string, unknown>) ?? {},
    }))

    return Response.json({ data, total: data.length })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthenticated') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/proposals] Error:', err)
    return Response.json({ data: [], total: 0 })
  }
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = NewProposalSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const { userId, tenantId } = await requireAuth()
    const admin = createAdminClient()
    const data = parsed.data

    const { data: userRow } = await admin
      .from('users')
      .select('id')
      .eq('supabase_user_id', userId)
      .maybeSingle()

    if (!userRow) return Response.json({ error: 'User not found' }, { status: 404 })

    const { data: newProposal, error } = await admin
      .from('proposals')
      .insert({
        tenant_id: tenantId,
        client_id: data.client_id,
        created_by: userRow.id,
        title: data.title ?? null,
        status: data.status ?? 'draft',
        template_id: data.template_id ?? null,
        context: data.context ?? {},
        sections: data.sections ?? {},
        tokens_used: data.tokens_used ?? 0,
        model: data.model ?? null,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return Response.json({
      id: newProposal.id,
      status: newProposal.status,
      created_at: newProposal.created_at ?? new Date().toISOString(),
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthenticated') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/proposals] POST Error:', err)
    return Response.json({ error: 'Failed to create proposal' }, { status: 500 })
  }
}

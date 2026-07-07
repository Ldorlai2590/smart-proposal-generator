import { z } from 'zod/v4'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { opportunityScore } from '@/lib/opportunity-score'

type RouteContext = { params: Promise<{ id: string }> }

const PatchClientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  company: z.string().max(255).nullable().optional(),
  email: z.string().email().max(255).nullable().optional().or(z.literal('')),
  industry: z.string().max(100).nullable().optional(),
  company_size: z.string().max(50).nullable().optional(),
})

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    const { tenantId } = await requireAuth()
    const admin = createAdminClient()

    const { data: client, error } = await admin
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 })

    // Real proposals history for this client (previously hardcoded to []).
    const { data: proposals } = await admin
      .from('proposals')
      .select('id, title, status, context, created_at')
      .eq('tenant_id', tenantId)
      .eq('client_id', id)
      .order('created_at', { ascending: false })

    return Response.json({
      id: client.id,
      tenant_id: client.tenant_id,
      name: client.name,
      company: client.company,
      email: client.email,
      industry: client.industry,
      company_size: client.company_size,
      score: client.score || opportunityScore(client),
      created_at: client.created_at ?? new Date().toISOString(),
      proposals: (proposals ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        // The detail page reads `value` (numeric) for its totals.
        value: (p.context as { budget?: number } | null)?.budget ?? 0,
        created_at: p.created_at,
      })),
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthenticated') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/clients/[id]] GET Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = PatchClientSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const { tenantId } = await requireAuth()
    const admin = createAdminClient()

    // Ownership check before update
    const { data: existing, error: fetchErr } = await admin
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (fetchErr) throw new Error(fetchErr.message)
    if (!existing) return Response.json({ error: 'Client not found' }, { status: 404 })

    const updates = { ...parsed.data, updated_at: new Date().toISOString() }
    const { data: updated, error } = await admin
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return Response.json(updated)
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthenticated') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/clients/[id]] PUT Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    const { tenantId } = await requireAuth()
    const admin = createAdminClient()

    // Ownership check
    const { data: existing, error: fetchErr } = await admin
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (fetchErr) throw new Error(fetchErr.message)
    if (!existing) return Response.json({ error: 'Client not found' }, { status: 404 })

    // proposals.client_id has no ON DELETE cascade — block deletion if any exist
    // so we return a clear 409 instead of a raw FK violation.
    const { count } = await admin
      .from('proposals')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('client_id', id)
    if ((count ?? 0) > 0) {
      return Response.json(
        { error: 'No se puede eliminar: el cliente tiene propuestas asociadas.' },
        { status: 409 },
      )
    }

    const { error } = await admin
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(error.message)

    return new Response(null, { status: 204 })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthenticated') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/clients/[id]] DELETE Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

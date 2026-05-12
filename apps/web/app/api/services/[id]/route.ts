import { z } from 'zod/v4'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import type { BillingType } from '@/lib/types/service'

const BillingTypeSchema = z.enum(['monthly', 'one_time', 'quarterly', 'project'])

const PatchServiceSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  objective: z.string().max(1000).nullable().optional(),
  scope: z.string().max(2000).nullable().optional(),
  includes: z.array(z.string()).optional(),
  excludes: z.array(z.string()).optional(),
  duration_estimate: z.string().max(200).nullable().optional(),
  deliverables: z.array(z.string()).optional(),
  base_price: z.number().min(0).optional(),
  currency: z.string().max(10).optional(),
  customizable: z.boolean().optional(),
  billing_type: BillingTypeSchema.optional(),
  desired_margin: z.number().min(0).max(100).nullable().optional(),
  active: z.boolean().optional(),
})

function mapRow(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    tenant_id: r.tenant_id as string,
    company_id: (r.company_id as string | null) ?? '',
    name: r.name as string,
    category: (r.category as string | null) ?? '',
    description: (r.description as string | null) ?? '',
    objective: (r.objective as string | null) ?? undefined,
    scope: (r.scope as string | null) ?? undefined,
    includes: (r.includes as string[] | null) ?? [],
    excludes: (r.excludes as string[] | null) ?? [],
    duration_estimate: (r.duration_estimate as string | null) ?? undefined,
    deliverables: (r.deliverables as string[] | null) ?? [],
    base_price: (r.base_price as number | null) ?? 0,
    currency: (r.currency as string | null) ?? 'USD',
    customizable: (r.customizable as boolean | null) ?? false,
    billing_type: ((r.billing_type as string | null) ?? 'one_time') as BillingType,
    desired_margin: (r.desired_margin as number | null) ?? undefined,
    active: (r.active as boolean | null) ?? true,
    created_at: (r.created_at as string | null) ?? new Date().toISOString(),
  }
}

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    const { tenantId } = await requireAuth()
    const admin = createAdminClient()

    const { data: row, error } = await admin
      .from('services')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!row) return Response.json({ error: 'Service not found' }, { status: 404 })

    return Response.json(mapRow(row as Record<string, unknown>))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[api/services/${id}] GET Error:`, msg)

    if (msg === 'Unauthenticated') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = PatchServiceSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const { tenantId } = await requireAuth()
    const admin = createAdminClient()

    // Verify ownership before updating
    const { data: existing, error: fetchErr } = await admin
      .from('services')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (fetchErr) throw new Error(fetchErr.message)
    if (!existing) return Response.json({ error: 'Service not found' }, { status: 404 })

    const { data: updated, error } = await admin
      .from('services')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw new Error(error.message)

    return Response.json(mapRow(updated as Record<string, unknown>))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[api/services/${id}] PATCH Error:`, msg)

    if (msg === 'Unauthenticated') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    return Response.json({ error: `Error al actualizar servicio: ${msg}` }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    const { tenantId } = await requireAuth()
    const admin = createAdminClient()

    // Verify ownership before deleting
    const { data: existing, error: fetchErr } = await admin
      .from('services')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (fetchErr) throw new Error(fetchErr.message)
    if (!existing) return Response.json({ error: 'Service not found' }, { status: 404 })

    const { error } = await admin
      .from('services')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) throw new Error(error.message)

    return new Response(null, { status: 204 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[api/services/${id}] DELETE Error:`, msg)

    if (msg === 'Unauthenticated') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    return Response.json({ error: `Error al eliminar servicio: ${msg}` }, { status: 500 })
  }
}

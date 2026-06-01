import { z } from 'zod/v4'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import type { BillingType } from '@/lib/types/service'

const BillingTypeSchema = z.enum(['monthly', 'one_time', 'quarterly', 'project'])

const NewServiceSchema = z.object({
  name: z.string().min(1, 'name is required').max(300),
  category: z.string().min(1, 'category is required').max(100),
  description: z.string().max(2000).optional().default(''),
  objective: z.string().max(1000).nullable().optional(),
  scope: z.string().max(2000).nullable().optional(),
  includes: z.array(z.string()).optional().default([]),
  excludes: z.array(z.string()).optional().default([]),
  duration_estimate: z.string().max(200).nullable().optional(),
  deliverables: z.array(z.string()).optional().default([]),
  base_price: z.number().min(0),
  currency: z.string().max(10).optional().default('USD'),
  customizable: z.boolean().optional().default(false),
  billing_type: BillingTypeSchema.optional().default('one_time'),
  desired_margin: z.number().min(0).max(100).nullable().optional(),
  active: z.boolean().optional().default(true),
})

/** Map a raw Supabase row to the Service shape the frontend expects */
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

export async function GET(req: Request) {
  try {
    const { tenantId } = await requireAuth()
    const admin = createAdminClient()

    const url = new URL(req.url)
    const search = url.searchParams.get('search') ?? ''
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 500)
    const page = parseInt(url.searchParams.get('page') ?? '1')
    const offset = (page - 1) * limit

    let query = admin
      .from('services')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      const esc = search.replace(/%/g, '\\%').replace(/_/g, '\\_')
      query = query.or(`name.ilike.%${esc}%,description.ilike.%${esc}%,category.ilike.%${esc}%`)
    }

    const { data: rows, error } = await query

    // If the table doesn't exist yet, return empty instead of crashing
    if (error) {
      const isTableMissing =
        error.message.toLowerCase().includes('does not exist') ||
        error.message.toLowerCase().includes('relation') ||
        error.code === '42P01'

      if (isTableMissing) {
        console.warn('[api/services] GET: services table not found — returning empty list')
        return Response.json({ data: [], total: 0, items: [], page, per_page: limit, pages: 0 })
      }
      throw new Error(error.message)
    }

    const data = (rows ?? []).map(mapRow)
    return Response.json({ data, total: data.length, items: data, page, per_page: limit, pages: 1 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[api/services] GET Error:', msg)

    if (msg === 'Unauthenticated') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg === 'Tenant not found') return Response.json({ error: 'Tenant no encontrado', detail: msg }, { status: 401 })

    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  let tenantId: string
  try {
    const session = await requireAuth()
    tenantId = session.tenantId
  } catch {
    return Response.json({ error: 'No autenticado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = NewServiceSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const d = parsed.data

    const { data: newService, error } = await admin
      .from('services')
      .insert({
        tenant_id: tenantId,
        name: d.name,
        category: d.category,
        description: d.description,
        objective: d.objective ?? null,
        scope: d.scope ?? null,
        includes: d.includes,
        excludes: d.excludes,
        duration_estimate: d.duration_estimate ?? null,
        deliverables: d.deliverables,
        base_price: d.base_price,
        currency: d.currency,
        customizable: d.customizable,
        billing_type: d.billing_type,
        desired_margin: d.desired_margin ?? null,
        active: d.active,
      })
      .select()
      .single()

    if (error) {
      const isTableMissing =
        error.message.toLowerCase().includes('does not exist') ||
        error.message.toLowerCase().includes('relation') ||
        error.code === '42P01'

      if (isTableMissing) {
        return Response.json(
          { error: 'La tabla de servicios aún no ha sido creada en la base de datos.' },
          { status: 503 }
        )
      }
      throw new Error(error.message)
    }

    return Response.json(mapRow(newService as Record<string, unknown>), { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[api/services] POST Error:', msg)

    if (msg === 'Unauthenticated') return Response.json({ error: 'No autenticado', detail: msg }, { status: 401 })
    if (msg === 'Tenant not found')
      return Response.json({ error: 'Tenant no encontrado. Cierra sesión y vuelve a iniciar.', detail: msg }, { status: 401 })

    return Response.json({ error: 'Error al crear servicio. Intenta de nuevo.' }, { status: 500 })
  }
}

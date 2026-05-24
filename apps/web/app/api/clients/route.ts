import { z } from 'zod/v4'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

const NewClientSchema = z.object({
  name: z.string().min(1, 'name is required').max(200),
  company: z.string().max(200).nullable().optional(),
  email: z.string().email().max(200).nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  company_size: z.string().max(50).nullable().optional(),
  // v2 expanded fields
  contact_name: z.string().max(200).nullable().optional(),
  contact_role: z.string().max(200).nullable().optional(),
  contact_phone: z.string().max(50).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  instagram: z.string().max(200).nullable().optional(),
  facebook: z.string().max(200).nullable().optional(),
  linkedin: z.string().max(200).nullable().optional(),
  tiktok: z.string().max(200).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export async function GET(req: Request) {
  try {
    const { tenantId } = await requireAuth()
    const admin = createAdminClient()

    const url = new URL(req.url)
    const search = url.searchParams.get('search') ?? ''
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200)
    const page = parseInt(url.searchParams.get('page') ?? '1')
    const offset = (page - 1) * limit

    let query = admin
      .from('clients')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      const esc = search.replace(/%/g, '\\%').replace(/_/g, '\\_')
      query = query.or(`name.ilike.%${esc}%,company.ilike.%${esc}%`)
    }

    const { data: rows, error } = await query
    if (error) throw new Error(error.message)

    const data = (rows ?? []).map((r) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      name: r.name,
      company: r.company,
      email: r.email,
      industry: r.industry,
      company_size: r.company_size,
      score: r.score ?? 0,
      created_at: r.created_at ?? new Date().toISOString(),
    }))

    return Response.json({ data, total: data.length, items: data, page, per_page: limit, pages: 1 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[api/clients] GET Error:', msg, err)

    if (msg === 'Unauthenticated') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg === 'Tenant not found') return Response.json({ error: 'Tenant no encontrado', detail: msg }, { status: 401 })

    return Response.json({ data: [], total: 0, items: [], pages: 0, page: 1, per_page: 50 })
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

  const parsed = NewClientSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const data = parsed.data

    const { data: newClient, error } = await admin
      .from('clients')
      .insert({
        tenant_id: tenantId,
        name: data.name,
        company: data.company ?? null,
        email: data.email ?? null,
        industry: data.industry ?? null,
        company_size: data.company_size ?? null,
        contact_name: data.contact_name ?? null,
        contact_role: data.contact_role ?? null,
        contact_phone: data.contact_phone ?? null,
        website: data.website ?? null,
        instagram: data.instagram ?? null,
        facebook: data.facebook ?? null,
        linkedin: data.linkedin ?? null,
        tiktok: data.tiktok ?? null,
        metadata: data.metadata ?? null,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return Response.json({
      id: newClient.id,
      tenant_id: newClient.tenant_id,
      name: newClient.name,
      company: newClient.company,
      email: newClient.email,
      industry: newClient.industry,
      company_size: newClient.company_size,
      contact_name: newClient.contact_name,
      contact_role: newClient.contact_role,
      contact_phone: newClient.contact_phone,
      website: newClient.website,
      instagram: newClient.instagram,
      facebook: newClient.facebook,
      linkedin: newClient.linkedin,
      tiktok: newClient.tiktok,
      metadata: newClient.metadata,
      score: newClient.score ?? 0,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[api/clients] POST Error:', msg, err)

    if (msg === 'Unauthenticated') return Response.json({ error: 'No autenticado', detail: msg }, { status: 401 })
    if (msg === 'Tenant not found') return Response.json({ error: 'Tenant no encontrado. Cierra sesión y vuelve a iniciar.', detail: msg }, { status: 401 })

    return Response.json({ error: `Error al crear cliente: ${msg}`, detail: msg }, { status: 500 })
  }
}

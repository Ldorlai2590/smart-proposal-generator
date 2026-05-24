import { z } from 'zod/v4'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

// Fields stored in tenants.metadata JSONB (in addition to tenants.name)
const CompanyMetaSchema = z.object({
  website: z.string().max(500).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  currency: z.string().max(10).nullable().optional(),
  instagram: z.string().max(200).nullable().optional(),
  facebook: z.string().max(200).nullable().optional(),
  linkedin: z.string().max(200).nullable().optional(),
  tiktok: z.string().max(200).nullable().optional(),
  what_we_do: z.string().max(500).nullable().optional(),
  purpose: z.string().max(500).nullable().optional(),
  ideal_clients: z.string().max(500).nullable().optional(),
  differentiators: z.array(z.string().max(200)).max(5).nullable().optional(),
  focus_industries: z.array(z.string().max(100)).nullable().optional(),
  logo_url: z.string().max(1000).nullable().optional(),
  brand_manual_url: z.string().max(1000).nullable().optional(),
  example_proposal_url: z.string().max(1000).nullable().optional(),
  primary_color: z.string().max(20).nullable().optional(),
  secondary_color: z.string().max(20).nullable().optional(),
  accent_color: z.string().max(20).nullable().optional(),
  font_heading: z.string().max(100).nullable().optional(),
  font_body: z.string().max(100).nullable().optional(),
  has_brand_manual: z.boolean().nullable().optional(),
  has_example_proposal: z.boolean().nullable().optional(),
})

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  metadata: CompanyMetaSchema.optional(),
})

export async function GET() {
  try {
    const { tenantId } = await requireAuth()
    const admin = createAdminClient()

    const { data: tenant, error } = await admin
      .from('tenants')
      .select('id, name, metadata, created_at')
      .eq('id', tenantId)
      .single()

    if (error) throw new Error(error.message)

    return Response.json({
      id: tenant.id,
      name: tenant.name,
      metadata: tenant.metadata ?? {},
      created_at: tenant.created_at,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[api/company] GET Error:', msg)

    if (msg === 'Unauthenticated') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg === 'Tenant not found') return Response.json({ error: 'Tenant no encontrado' }, { status: 401 })

    return Response.json({ error: `Error al obtener datos de empresa: ${msg}` }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  let tenantId: string
  try {
    const session = await requireAuth()
    tenantId = session.tenantId
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    const { data: current, error: fetchErr } = await admin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single()

    if (fetchErr) throw new Error(fetchErr.message)

    const existingMeta = (current?.metadata as Record<string, unknown>) ?? {}
    const newMeta = parsed.data.metadata ?? {}

    const updates: Record<string, unknown> = {
      metadata: { ...existingMeta, ...newMeta },
    }
    if (parsed.data.name !== undefined) {
      updates.name = parsed.data.name
    }

    const { data: updated, error: updateErr } = await admin
      .from('tenants')
      .update(updates)
      .eq('id', tenantId)
      .select('id, name, metadata, created_at')
      .single()

    if (updateErr) throw new Error(updateErr.message)

    return Response.json({
      id: updated.id,
      name: updated.name,
      metadata: updated.metadata ?? {},
      created_at: updated.created_at,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[api/company] PATCH Error:', msg)

    if (msg === 'Unauthenticated') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg === 'Tenant not found') return Response.json({ error: 'Tenant no encontrado' }, { status: 401 })

    return Response.json({ error: `Error al guardar datos de empresa: ${msg}` }, { status: 500 })
  }
}

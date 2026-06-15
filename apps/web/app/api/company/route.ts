import { z } from 'zod/v4'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, ensureTenant } from '@/lib/auth'

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
  certifications: z.array(z.string().max(120)).max(20).nullable().optional(),
  faqs: z.array(z.object({ question: z.string().max(300), answer: z.string().max(2000) })).max(20).nullable().optional(),
  case_studies: z.array(z.object({ client: z.string().max(200), result: z.string().max(300), description: z.string().max(1000) })).max(10).nullable().optional(),
  testimonials: z.array(z.object({ author: z.string().max(200), role: z.string().max(200).nullable().optional(), quote: z.string().max(1000) })).max(10).nullable().optional(),
})

const PatchSchema = z.object({
  name: z.string().max(200).optional(),
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

    return Response.json({ error: 'Error al procesar la solicitud de empresa' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  let tenantId: string
  try {
    const session = await requireAuth()
    tenantId = session.tenantId
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    // Tenant missing → auto-provision for a freshly-authenticated user, then proceed.
    if (msg === 'Tenant not found') {
      try {
        const supabase = await createClient()
        const { data: { user }, error: userErr } = await supabase.auth.getUser()
        if (userErr || !user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        tenantId = await ensureTenant(user.id, user.email ?? '')
      } catch (provisionErr) {
        const pMsg = provisionErr instanceof Error ? provisionErr.message : String(provisionErr)
        console.error('[api/company] PATCH Error:', pMsg)
        return Response.json({ error: 'Error al procesar la solicitud de empresa' }, { status: 500 })
      }
    } else {
      // Genuinely unauthenticated (or other auth failure) → 401.
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
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
    // Trim the name; only update when it's a non-empty value, otherwise leave
    // the existing tenant name untouched (blank input == "no change").
    if (parsed.data.name !== undefined) {
      const trimmedName = parsed.data.name.trim()
      if (trimmedName.length > 0) {
        updates.name = trimmedName
      }
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

    return Response.json({ error: 'Error al procesar la solicitud de empresa' }, { status: 500 })
  }
}

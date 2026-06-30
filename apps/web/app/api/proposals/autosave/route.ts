import { z } from 'zod/v4'

export const runtime = 'nodejs'
export const maxDuration = 10

// Same caps as the export endpoint (ExportRequestSchema): bound per-section
// size and key count so an authenticated client cannot inflate the proposals
// JSONB column or cause OOM on read-back.
const AutosaveSchema = z.object({
  proposalId: z.string().min(1),
  sections: z
    .record(z.string().max(100), z.string().max(50_000))
    .refine((r) => Object.keys(r).length <= 25, { message: 'too many sections' }),
})

export async function POST(req: Request): Promise<Response> {
  let tenantId: string
  try {
    const { requireAuth } = await import('@/lib/auth')
    const session = await requireAuth()
    tenantId = session.tenantId
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = AutosaveSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', issues: parsed.error.issues }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { proposalId, sections } = parsed.data

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const { error } = await admin
    .from('proposals')
    .update({ sections, updated_at: new Date().toISOString() })
    .eq('id', proposalId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[autosave] Supabase update failed:', error.message)
    return new Response(JSON.stringify({ error: 'Save failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ saved: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

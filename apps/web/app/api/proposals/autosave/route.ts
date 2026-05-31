import { z } from 'zod/v4'

export const runtime = 'nodejs'
export const maxDuration = 10

const AutosaveSchema = z.object({
  proposalId: z.string().min(1),
  sections: z.record(z.string(), z.string()),
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

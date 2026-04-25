import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    return Response.json({
      id: client.id,
      tenant_id: client.tenant_id,
      name: client.name,
      company: client.company,
      email: client.email,
      industry: client.industry,
      company_size: client.company_size,
      score: client.score ?? 0,
      created_at: client.created_at ?? new Date().toISOString(),
      proposals: [],
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthenticated') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/clients/[id]] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

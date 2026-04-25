import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const { tenantId } = await requireAuth()
    const admin = createAdminClient()

    const { data: row, error } = await admin
      .from('proposals')
      .select('*, clients(name)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!row) return Response.json({ error: 'Proposal not found' }, { status: 404 })

    return Response.json({
      data: {
        id: row.id,
        title: row.title,
        status: row.status,
        client_id: (row.clients as { name?: string } | null)?.name ?? row.client_id,
        created_at: row.created_at ?? new Date().toISOString(),
        updated_at: row.updated_at ?? new Date().toISOString(),
        context: (row.context as Record<string, unknown>) ?? {},
        sections: (row.sections as Record<string, string>) ?? {},
      },
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthenticated') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/proposals/[id]] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

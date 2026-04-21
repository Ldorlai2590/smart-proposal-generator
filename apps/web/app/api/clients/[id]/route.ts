import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients } from '@/db/schema'
import { requireAuth } from '@/lib/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { tenantId } = await requireAuth()

    const client = await db.query.clients.findFirst({
      where: and(eq(clients.id, id), eq(clients.tenantId, tenantId)),
    })

    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 })

    return Response.json({
      id: client.id,
      tenant_id: client.tenantId,
      name: client.name,
      company: client.company,
      email: client.email,
      industry: client.industry,
      company_size: client.companySize,
      score: client.score ?? 0,
      created_at: client.createdAt?.toISOString() ?? new Date().toISOString(),
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

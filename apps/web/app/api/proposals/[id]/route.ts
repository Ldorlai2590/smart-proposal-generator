import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { proposals } from '@/db/schema'
import { requireAuth } from '@/lib/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const { tenantId } = await requireAuth()

    const row = await db.query.proposals.findFirst({
      where: eq(proposals.id, id),
      with: { client: true },
    })

    if (!row || row.tenantId !== tenantId) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 })
    }

    return Response.json({
      data: {
        id: row.id,
        title: row.title,
        status: row.status,
        client_id: row.client?.name ?? row.clientId,
        created_at: row.createdAt?.toISOString() ?? new Date().toISOString(),
        updated_at: row.updatedAt?.toISOString() ?? new Date().toISOString(),
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

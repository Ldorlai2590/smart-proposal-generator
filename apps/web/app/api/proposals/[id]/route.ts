import { eq } from 'drizzle-orm'
import { getProposalById } from '@/lib/demo-data'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (DEMO_MODE) {
    const proposal = getProposalById(id)
    if (!proposal) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 })
    }
    return Response.json({ data: proposal })
  }

  // Production mode — query DB
  const { db } = await import('@/lib/db')
  const { proposals, tenants } = await import('@/db/schema')
  const { auth } = await import('@clerk/nextjs/server')
  const { orgId } = await auth()
  if (!orgId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.clerkOrgId, orgId) })
  if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 })

  try {
    const row = await db.query.proposals.findFirst({
      where: eq(proposals.id, id),
      with: { client: true },
    })

    if (!row || row.tenantId !== tenant.id) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 })
    }

    const data = {
      id: row.id,
      title: row.title,
      status: row.status,
      client_id: row.client?.name ?? row.clientId,
      created_at: row.createdAt?.toISOString() ?? new Date().toISOString(),
      updated_at: row.updatedAt?.toISOString() ?? new Date().toISOString(),
      context: (row.context as Record<string, unknown>) ?? {},
      sections: (row.sections as Record<string, string>) ?? {},
    }
    return Response.json({ data })
  } catch (err) {
    console.error('[api/proposals/[id]] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

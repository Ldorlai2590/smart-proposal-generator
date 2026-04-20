import { eq, and } from 'drizzle-orm'
import { getClientById, getClientProposals } from '@/lib/demo-data'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (DEMO_MODE) {
    const client = getClientById(id)
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 })
    }
    return Response.json({
      ...client,
      proposals: getClientProposals(id),
    })
  }

  // Production: use real DB
  const { db } = await import('@/lib/db')
  const { clients, tenants } = await import('@/db/schema')
  const { auth } = await import('@clerk/nextjs/server')
  const { orgId } = await auth()
  if (!orgId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.clerkOrgId, orgId) })
  if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 })

  try {
    const client = await db.query.clients.findFirst({
      where: and(eq(clients.id, id), eq(clients.tenantId, tenant.id)),
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
    console.error('[api/clients/[id]] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

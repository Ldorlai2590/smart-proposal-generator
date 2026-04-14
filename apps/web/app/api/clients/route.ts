import { db } from '@/lib/db'
import { clients, tenants } from '@/db/schema'
import { eq, desc, ilike, or, and } from 'drizzle-orm'

const DEMO_MODE = process.env.DEMO_MODE === 'true'
const DEMO_TENANT_CLERK_ORG = 'org_3CLrWMV7SmXmUKGYauf8fYagW17'

async function getOrgId(): Promise<string | null> {
  if (DEMO_MODE) return DEMO_TENANT_CLERK_ORG
  const { auth } = await import('@clerk/nextjs/server')
  const { orgId } = await auth()
  return orgId ?? null
}

export async function GET(req: Request) {
  const orgId = await getOrgId()
  if (!orgId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Resolve tenant UUID from clerk org ID
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.clerkOrgId, orgId),
  })
  if (!tenant) {
    return Response.json({ data: [], total: 0, items: [], pages: 0, page: 1, per_page: 20 })
  }

  const url = new URL(req.url)
  const search = url.searchParams.get('search') ?? ''
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? url.searchParams.get('per_page') ?? '50'), 200)
  const page = parseInt(url.searchParams.get('page') ?? '1')

  try {
    const conditions = [eq(clients.tenantId, tenant.id)]
    if (search) {
      conditions.push(
        or(
          ilike(clients.name, `%${search}%`),
          ilike(clients.company, `%${search}%`),
        )!
      )
    }

    const rows = await db.query.clients.findMany({
      where: and(...conditions),
      orderBy: [desc(clients.createdAt)],
      limit,
      offset: (page - 1) * limit,
    })

    const data = rows.map((r) => ({
      id: r.id,
      tenant_id: r.tenantId,
      name: r.name,
      company: r.company,
      email: r.email,
      industry: r.industry,
      company_size: r.companySize,
      score: r.score ?? 0,
      created_at: r.createdAt?.toISOString() ?? new Date().toISOString(),
    }))

    // Support both response formats used by different components
    return Response.json({
      data,
      total: data.length,
      items: data,
      page,
      per_page: limit,
      pages: 1,
    })
  } catch (err) {
    console.error('[api/clients] Error:', err)
    return Response.json({ data: [], total: 0, items: [], pages: 0, page: 1, per_page: limit })
  }
}

export async function POST(req: Request) {
  const orgId = await getOrgId()
  if (!orgId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.clerkOrgId, orgId),
  })
  if (!tenant) {
    return Response.json({ error: 'Tenant not found' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const [newClient] = await db
      .insert(clients)
      .values({
        tenantId: tenant.id,
        name: body.name,
        company: body.company ?? null,
        email: body.email ?? null,
        industry: body.industry ?? null,
        companySize: body.company_size ?? null,
      })
      .returning()

    return Response.json({
      id: newClient.id,
      tenant_id: newClient.tenantId,
      name: newClient.name,
      company: newClient.company,
      email: newClient.email,
      industry: newClient.industry,
      company_size: newClient.companySize,
      score: newClient.score ?? 0,
    })
  } catch (err) {
    console.error('[api/clients] POST Error:', err)
    return Response.json({ error: 'Failed to create client' }, { status: 500 })
  }
}

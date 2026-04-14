import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { proposals, tenants, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const { orgId } = await auth()
  if (!orgId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.clerkOrgId, orgId),
  })
  if (!tenant) {
    return Response.json({ data: [], total: 0 })
  }

  try {
    const rows = await db.query.proposals.findMany({
      where: eq(proposals.tenantId, tenant.id),
      orderBy: [desc(proposals.createdAt)],
      limit: 200,
      with: {
        client: true,
      },
    })

    const data = rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      client_id: r.client?.name ?? r.clientId,
      created_at: r.createdAt?.toISOString() ?? new Date().toISOString(),
      updated_at: r.updatedAt?.toISOString() ?? new Date().toISOString(),
      context: (r.context as Record<string, unknown>) ?? {},
    }))

    return Response.json({ data, total: data.length })
  } catch (err) {
    console.error('[api/proposals] Error:', err)
    return Response.json({ data: [], total: 0 })
  }
}

export async function POST(req: Request) {
  const { orgId, userId } = await auth()
  if (!orgId || !userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.clerkOrgId, orgId),
  })
  if (!tenant) {
    return Response.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  })
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const [newProposal] = await db
      .insert(proposals)
      .values({
        tenantId: tenant.id,
        clientId: body.client_id,
        createdBy: user.id,
        title: body.title ?? null,
        status: body.status ?? 'draft',
        templateId: body.template_id ?? null,
        context: body.context ?? {},
        sections: body.sections ?? {},
        tokensUsed: body.tokens_used ?? 0,
        model: body.model ?? null,
      })
      .returning()

    return Response.json({
      id: newProposal.id,
      status: newProposal.status,
      created_at: newProposal.createdAt?.toISOString() ?? new Date().toISOString(),
    })
  } catch (err) {
    console.error('[api/proposals] POST Error:', err)
    return Response.json({ error: 'Failed to create proposal' }, { status: 500 })
  }
}

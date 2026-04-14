import { eq, desc } from 'drizzle-orm'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

// ─── Demo mock data (in-memory) ──────────────────────────────
const DEMO_PROPOSALS: Array<{
  id: string; title: string; status: string; client_id: string;
  created_at: string; updated_at: string; context: Record<string, unknown>;
}> = [
  {
    id: 'demo-prop-1', title: 'Propuesta Paid Media + Landing Page - TechFlow Solutions',
    status: 'sent', client_id: 'María García',
    created_at: '2026-04-10T14:00:00Z', updated_at: '2026-04-10T14:00:00Z',
    context: { problema: 'Necesitan aumentar leads calificados', services: ['Paid Media', 'Landing Page'], tono: 'consultivo' },
  },
  {
    id: 'demo-prop-2', title: 'Propuesta SEO + Content Marketing - Retail Plus Chile',
    status: 'draft', client_id: 'Carlos Mendoza',
    created_at: '2026-04-08T10:00:00Z', updated_at: '2026-04-08T10:00:00Z',
    context: { problema: 'Bajo posicionamiento orgánico', services: ['SEO', 'Content Marketing'], tono: 'formal' },
  },
]

// ─── Handlers ────────────────────────────────────────────────

export async function GET() {
  if (DEMO_MODE) {
    return Response.json({ data: DEMO_PROPOSALS, total: DEMO_PROPOSALS.length })
  }

  const { db } = await import('@/lib/db')
  const { proposals, tenants } = await import('@/db/schema')
  const { auth } = await import('@clerk/nextjs/server')
  const { orgId } = await auth()
  if (!orgId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.clerkOrgId, orgId) })
  if (!tenant) return Response.json({ data: [], total: 0 })

  try {
    const rows = await db.query.proposals.findMany({
      where: eq(proposals.tenantId, tenant.id), orderBy: [desc(proposals.createdAt)],
      limit: 200, with: { client: true },
    })
    const data = rows.map((r) => ({
      id: r.id, title: r.title, status: r.status,
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
  if (DEMO_MODE) {
    const body = await req.json()
    const newProp = {
      id: `demo-prop-${Date.now()}`, title: body.title ?? 'Nueva propuesta',
      status: 'draft', client_id: body.client_id ?? 'Demo',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      context: body.context ?? {},
    }
    DEMO_PROPOSALS.unshift(newProp)
    return Response.json({ id: newProp.id, status: newProp.status, created_at: newProp.created_at })
  }

  const { db } = await import('@/lib/db')
  const { proposals, tenants, users } = await import('@/db/schema')
  const { auth } = await import('@clerk/nextjs/server')
  const session = await auth()
  if (!session.orgId || !session.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.clerkOrgId, session.orgId) })
  if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 })

  const user = await db.query.users.findFirst({ where: eq(users.clerkUserId, session.userId) })
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  try {
    const body = await req.json()
    const [newProposal] = await db.insert(proposals).values({
      tenantId: tenant.id, clientId: body.client_id, createdBy: user.id,
      title: body.title ?? null, status: body.status ?? 'draft',
      templateId: body.template_id ?? null, context: body.context ?? {},
      sections: body.sections ?? {}, tokensUsed: body.tokens_used ?? 0, model: body.model ?? null,
    }).returning()
    return Response.json({
      id: newProposal.id, status: newProposal.status,
      created_at: newProposal.createdAt?.toISOString() ?? new Date().toISOString(),
    })
  } catch (err) {
    console.error('[api/proposals] POST Error:', err)
    return Response.json({ error: 'Failed to create proposal' }, { status: 500 })
  }
}

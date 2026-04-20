import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import {
  _DEMO_PROPOSALS_MUTABLE,
  capDemoProposals,
  type DemoProposal,
} from '@/lib/demo-data'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

// Re-export for any legacy consumer.
export { DEMO_PROPOSALS } from '@/lib/demo-data'

// ─── Validation ─────────────────────────────────────────────

const StatusEnum = z.enum(['draft', 'generating', 'generated', 'sent', 'accepted', 'rejected'])

const NewProposalSchema = z.object({
  title: z.string().max(500).nullable().optional(),
  client_id: z.string().min(1, 'client_id is required').max(200),
  status: StatusEnum.optional(),
  template_id: z.string().nullable().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  sections: z.record(z.string(), z.string()).optional(),
  tokens_used: z.number().int().nonnegative().optional(),
  model: z.string().max(100).nullable().optional(),
})

// ─── Handlers ────────────────────────────────────────────────

export async function GET() {
  if (DEMO_MODE) {
    // Return list without full sections (lighter payload for list view)
    const data = _DEMO_PROPOSALS_MUTABLE.map(({ sections: _s, ...rest }) => rest)
    return Response.json({ data, total: data.length })
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
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = NewProposalSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const data = parsed.data

  if (DEMO_MODE) {
    const newProp: DemoProposal = {
      id: `demo-prop-${Date.now()}`,
      title: data.title ?? 'Nueva propuesta',
      status: data.status ?? 'draft',
      client_id: data.client_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      context: data.context ?? {},
      sections: data.sections ?? {},
    }
    _DEMO_PROPOSALS_MUTABLE.unshift(newProp)
    capDemoProposals()
    return Response.json({
      id: newProp.id,
      status: newProp.status,
      created_at: newProp.created_at,
    })
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
    const [newProposal] = await db.insert(proposals).values({
      tenantId: tenant.id, clientId: data.client_id, createdBy: user.id,
      title: data.title ?? null, status: data.status ?? 'draft',
      templateId: data.template_id ?? null, context: data.context ?? {},
      sections: data.sections ?? {}, tokensUsed: data.tokens_used ?? 0, model: data.model ?? null,
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

import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { proposals, users } from '@/db/schema'
import { requireAuth } from '@/lib/auth'

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

export async function GET() {
  try {
    const { tenantId } = await requireAuth()

    const rows = await db.query.proposals.findMany({
      where: eq(proposals.tenantId, tenantId),
      orderBy: [desc(proposals.createdAt)],
      limit: 200,
      with: { client: true },
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
    if (err instanceof Error && err.message === 'Unauthenticated') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
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
    return Response.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const { userId, tenantId } = await requireAuth()
    const data = parsed.data

    const user = await db.query.users.findFirst({
      where: eq(users.supabaseUserId, userId),
    })
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

    const [newProposal] = await db.insert(proposals).values({
      tenantId,
      clientId: data.client_id,
      createdBy: user.id,
      title: data.title ?? null,
      status: data.status ?? 'draft',
      templateId: data.template_id ?? null,
      context: data.context ?? {},
      sections: data.sections ?? {},
      tokensUsed: data.tokens_used ?? 0,
      model: data.model ?? null,
    }).returning()

    return Response.json({
      id: newProposal.id,
      status: newProposal.status,
      created_at: newProposal.createdAt?.toISOString() ?? new Date().toISOString(),
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthenticated') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/proposals] POST Error:', err)
    return Response.json({ error: 'Failed to create proposal' }, { status: 500 })
  }
}

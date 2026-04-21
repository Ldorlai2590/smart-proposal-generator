import { eq, desc, ilike, or, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { clients } from '@/db/schema'
import { requireAuth } from '@/lib/auth'

const NewClientSchema = z.object({
  name: z.string().min(1, 'name is required').max(200),
  company: z.string().max(200).nullable().optional(),
  email: z.string().email().max(200).nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  company_size: z.string().max(50).nullable().optional(),
})

export async function GET(req: Request) {
  try {
    const { tenantId } = await requireAuth()

    const url = new URL(req.url)
    const search = url.searchParams.get('search') ?? ''
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200)
    const page = parseInt(url.searchParams.get('page') ?? '1')

    const conditions = [eq(clients.tenantId, tenantId)]
    if (search) {
      conditions.push(or(ilike(clients.name, `%${search}%`), ilike(clients.company, `%${search}%`))!)
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

    return Response.json({ data, total: data.length, items: data, page, per_page: limit, pages: 1 })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthenticated') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/clients] GET Error:', err)
    return Response.json({ data: [], total: 0, items: [], pages: 0, page: 1, per_page: 50 })
  }
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = NewClientSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const { tenantId } = await requireAuth()
    const data = parsed.data

    const [newClient] = await db.insert(clients).values({
      tenantId,
      name: data.name,
      company: data.company ?? null,
      email: data.email ?? null,
      industry: data.industry ?? null,
      companySize: data.company_size ?? null,
    }).returning()

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
    if (err instanceof Error && err.message === 'Unauthenticated') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/clients] POST Error:', err)
    return Response.json({ error: 'Failed to create client' }, { status: 500 })
  }
}

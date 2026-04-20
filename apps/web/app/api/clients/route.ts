import { eq, desc, ilike, or, and } from 'drizzle-orm'
import { z } from 'zod'
import {
  _DEMO_CLIENTS_MUTABLE,
  capDemoClients,
  type DemoClient,
} from '@/lib/demo-data'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

// Re-export for any consumer still importing DEMO_CLIENTS from here (backward compat).
export { DEMO_CLIENTS } from '@/lib/demo-data'

// ─── Validation ─────────────────────────────────────────────

const NewClientSchema = z.object({
  name: z.string().min(1, 'name is required').max(200),
  company: z.string().max(200).nullable().optional(),
  email: z.string().email().max(200).nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  company_size: z.string().max(50).nullable().optional(),
})

// Accent-insensitive search helper
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// ─── Handlers ───────────────────────────────────────────────

export async function GET(req: Request) {
  if (DEMO_MODE) {
    const url = new URL(req.url)
    const rawSearch = url.searchParams.get('search') ?? ''
    const searchNorm = normalize(rawSearch)
    const filtered = searchNorm
      ? _DEMO_CLIENTS_MUTABLE.filter(
          (c) => normalize(c.name).includes(searchNorm) || normalize(c.company).includes(searchNorm),
        )
      : _DEMO_CLIENTS_MUTABLE
    return Response.json({
      data: filtered,
      total: filtered.length,
      items: filtered,
      page: 1,
      per_page: 50,
      pages: 1,
    })
  }

  // Production: use real DB
  const { db } = await import('@/lib/db')
  const { clients, tenants } = await import('@/db/schema')
  const { auth } = await import('@clerk/nextjs/server')
  const { orgId } = await auth()
  if (!orgId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.clerkOrgId, orgId) })
  if (!tenant) return Response.json({ data: [], total: 0, items: [], pages: 0, page: 1, per_page: 20 })

  const url = new URL(req.url)
  const search = url.searchParams.get('search') ?? ''
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200)
  const page = parseInt(url.searchParams.get('page') ?? '1')

  try {
    const conditions = [eq(clients.tenantId, tenant.id)]
    if (search) {
      conditions.push(or(ilike(clients.name, `%${search}%`), ilike(clients.company, `%${search}%`))!)
    }
    const rows = await db.query.clients.findMany({
      where: and(...conditions), orderBy: [desc(clients.createdAt)], limit, offset: (page - 1) * limit,
    })
    const data = rows.map((r) => ({
      id: r.id, tenant_id: r.tenantId, name: r.name, company: r.company,
      email: r.email, industry: r.industry, company_size: r.companySize,
      score: r.score ?? 0, created_at: r.createdAt?.toISOString() ?? new Date().toISOString(),
    }))
    return Response.json({ data, total: data.length, items: data, page, per_page: limit, pages: 1 })
  } catch (err) {
    console.error('[api/clients] Error:', err)
    return Response.json({ data: [], total: 0, items: [], pages: 0, page: 1, per_page: limit })
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
    return Response.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const data = parsed.data

  if (DEMO_MODE) {
    const newClient: DemoClient = {
      id: `demo-${Date.now()}`,
      tenant_id: 'demo',
      name: data.name,
      company: data.company ?? '',
      email: data.email ?? '',
      industry: data.industry ?? '',
      company_size: data.company_size ?? '',
      score: 0,
      created_at: new Date().toISOString(),
    }
    _DEMO_CLIENTS_MUTABLE.unshift(newClient)
    capDemoClients()
    return Response.json(newClient)
  }

  const { db } = await import('@/lib/db')
  const { clients, tenants } = await import('@/db/schema')
  const { auth } = await import('@clerk/nextjs/server')
  const { orgId } = await auth()
  if (!orgId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.clerkOrgId, orgId) })
  if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 })

  try {
    const [newClient] = await db.insert(clients).values({
      tenantId: tenant.id, name: data.name, company: data.company ?? null,
      email: data.email ?? null, industry: data.industry ?? null, companySize: data.company_size ?? null,
    }).returning()
    return Response.json({
      id: newClient.id, tenant_id: newClient.tenantId, name: newClient.name,
      company: newClient.company, email: newClient.email, industry: newClient.industry,
      company_size: newClient.companySize, score: newClient.score ?? 0,
    })
  } catch (err) {
    console.error('[api/clients] POST Error:', err)
    return Response.json({ error: 'Failed to create client' }, { status: 500 })
  }
}

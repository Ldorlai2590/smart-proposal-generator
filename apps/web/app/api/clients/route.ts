import { eq, desc, ilike, or, and } from 'drizzle-orm'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

// ─── Demo mock data ─────────────────────────────────────────
const DEMO_CLIENTS = [
  { id: 'demo-1', tenant_id: 'demo', name: 'María García', company: 'TechFlow Solutions', email: 'maria@techflow.cl', industry: 'Tecnología', company_size: '50-200', score: 85, created_at: '2026-03-15T10:00:00Z' },
  { id: 'demo-2', tenant_id: 'demo', name: 'Carlos Mendoza', company: 'Retail Plus Chile', email: 'carlos@retailplus.cl', industry: 'Retail', company_size: '200-500', score: 72, created_at: '2026-03-10T14:00:00Z' },
  { id: 'demo-3', tenant_id: 'demo', name: 'Ana Rodríguez', company: 'HealthCare Innovations', email: 'ana@hcinnovations.cl', industry: 'Salud', company_size: '10-50', score: 91, created_at: '2026-02-28T09:00:00Z' },
  { id: 'demo-4', tenant_id: 'demo', name: 'Roberto Silva', company: 'EduPlatform LATAM', email: 'roberto@eduplatform.cl', industry: 'Educación', company_size: '50-200', score: 68, created_at: '2026-02-20T16:00:00Z' },
  { id: 'demo-5', tenant_id: 'demo', name: 'Valentina Torres', company: 'FinanzApp SpA', email: 'valentina@finanzapp.cl', industry: 'Finanzas', company_size: '10-50', score: 78, created_at: '2026-01-15T11:00:00Z' },
]

// ─── Handlers ───────────────────────────────────────────────

export async function GET(req: Request) {
  if (DEMO_MODE) {
    const url = new URL(req.url)
    const search = (url.searchParams.get('search') ?? '').toLowerCase()
    const filtered = search
      ? DEMO_CLIENTS.filter(c => c.name.toLowerCase().includes(search) || c.company.toLowerCase().includes(search))
      : DEMO_CLIENTS
    return Response.json({ data: filtered, total: filtered.length, items: filtered, page: 1, per_page: 50, pages: 1 })
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
  if (DEMO_MODE) {
    const body = await req.json()
    const newClient = {
      id: `demo-${Date.now()}`, tenant_id: 'demo', name: body.name,
      company: body.company ?? null, email: body.email ?? null,
      industry: body.industry ?? null, company_size: body.company_size ?? null, score: 0,
    }
    DEMO_CLIENTS.unshift({ ...newClient, created_at: new Date().toISOString() } as typeof DEMO_CLIENTS[0])
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
    const body = await req.json()
    const [newClient] = await db.insert(clients).values({
      tenantId: tenant.id, name: body.name, company: body.company ?? null,
      email: body.email ?? null, industry: body.industry ?? null, companySize: body.company_size ?? null,
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

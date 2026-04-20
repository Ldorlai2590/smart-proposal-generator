import { eq, and } from 'drizzle-orm'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

// Aligned with /api/clients/route.ts DEMO_CLIENTS — same names, accents, companies
const DEMO_CLIENTS = [
  {
    id: 'demo-1', tenant_id: 'demo', name: 'María García', company: 'TechFlow Solutions',
    email: 'maria@techflow.cl', industry: 'Tecnología', company_size: '50-200', score: 85,
    created_at: '2026-03-15T10:00:00Z',
    proposals: [
      { id: 'demo-prop-1', title: 'Propuesta Paid Media + Landing Page', status: 'accepted', created_at: '2026-04-13T14:00:00Z', value: 3500 },
      { id: 'demo-prop-8', title: 'Optimización de CRM HubSpot', status: 'accepted', created_at: '2026-04-02T09:00:00Z', value: 2200 },
      { id: 'demo-prop-11', title: 'Automatización de marketing', status: 'draft', created_at: '2026-04-12T11:00:00Z', value: 1800 },
    ],
  },
  {
    id: 'demo-2', tenant_id: 'demo', name: 'Carlos Mendoza', company: 'Retail Plus Chile',
    email: 'carlos@retailplus.cl', industry: 'Retail', company_size: '200-500', score: 72,
    created_at: '2026-03-10T14:00:00Z',
    proposals: [
      { id: 'demo-prop-2', title: 'Propuesta SEO + Content Marketing', status: 'sent', created_at: '2026-04-12T10:00:00Z', value: 2800 },
      { id: 'demo-prop-6', title: 'Programa de fidelización omnicanal', status: 'accepted', created_at: '2026-04-05T13:00:00Z', value: 4100 },
    ],
  },
  {
    id: 'demo-3', tenant_id: 'demo', name: 'Ana Rodríguez', company: 'Grupo Andino SpA',
    email: 'ana@grupoandino.cl', industry: 'Construcción', company_size: '200-500', score: 91,
    created_at: '2026-02-28T09:00:00Z',
    proposals: [
      { id: 'demo-prop-3', title: 'Estrategia Digital Integral', status: 'accepted', created_at: '2026-04-10T11:00:00Z', value: 5200 },
      { id: 'demo-prop-7', title: 'Rebranding y presencia web', status: 'accepted', created_at: '2026-04-04T10:00:00Z', value: 3800 },
      { id: 'demo-prop-12', title: 'Campaña LinkedIn Ads B2B', status: 'rejected', created_at: '2026-04-11T15:00:00Z', value: 2100 },
    ],
  },
  {
    id: 'demo-4', tenant_id: 'demo', name: 'Roberto Silva', company: 'FoodTech Ltda',
    email: 'roberto@foodtech.cl', industry: 'Alimentación', company_size: '10-50', score: 68,
    created_at: '2026-02-20T16:00:00Z',
    proposals: [
      { id: 'demo-prop-4', title: 'Rediseño de e-commerce + checkout', status: 'accepted', created_at: '2026-04-09T09:00:00Z', value: 2900 },
      { id: 'demo-prop-9', title: 'Packaging y branding de línea premium', status: 'accepted', created_at: '2026-04-01T14:00:00Z', value: 1700 },
    ],
  },
  {
    id: 'demo-5', tenant_id: 'demo', name: 'Valentina Torres', company: 'Innova Labs',
    email: 'valentina@innovalabs.cl', industry: 'Tecnología', company_size: '10-50', score: 78,
    created_at: '2026-01-15T11:00:00Z',
    proposals: [
      { id: 'demo-prop-5', title: 'Go-to-market para SaaS LATAM', status: 'accepted', created_at: '2026-04-08T10:00:00Z', value: 4600 },
      { id: 'demo-prop-10', title: 'Setup de Google Analytics 4', status: 'accepted', created_at: '2026-03-28T16:00:00Z', value: 1100 },
    ],
  },
]

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (DEMO_MODE) {
    const client = DEMO_CLIENTS.find((c) => c.id === id)
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 })
    }
    return Response.json(client)
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

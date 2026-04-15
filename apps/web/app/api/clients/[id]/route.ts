import { eq, and } from 'drizzle-orm'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

const DEMO_CLIENTS = [
  {
    id: 'demo-1', tenant_id: 'demo', name: 'Maria Garcia', company: 'TechFlow Solutions',
    email: 'maria@techflow.cl', industry: 'Tecnologia', company_size: '50-200', score: 85,
    created_at: '2026-03-15T10:00:00Z',
    proposals: [
      { id: 'prop-1', title: 'Plataforma de automatizacion interna', status: 'accepted', created_at: '2026-03-20T10:00:00Z', value: 12500000 },
      { id: 'prop-2', title: 'Migracion a cloud AWS', status: 'sent', created_at: '2026-04-01T14:00:00Z', value: 8700000 },
      { id: 'prop-3', title: 'Dashboard de metricas en tiempo real', status: 'draft', created_at: '2026-04-10T09:00:00Z', value: 5200000 },
    ],
  },
  {
    id: 'demo-2', tenant_id: 'demo', name: 'Carlos Mendoza', company: 'Retail Plus Chile',
    email: 'carlos@retailplus.cl', industry: 'Retail', company_size: '200-500', score: 72,
    created_at: '2026-03-10T14:00:00Z',
    proposals: [
      { id: 'prop-4', title: 'Sistema de inventario omnicanal', status: 'sent', created_at: '2026-03-25T11:00:00Z', value: 15000000 },
      { id: 'prop-5', title: 'App de fidelizacion de clientes', status: 'draft', created_at: '2026-04-05T16:00:00Z', value: 9800000 },
    ],
  },
  {
    id: 'demo-3', tenant_id: 'demo', name: 'Ana Rodriguez', company: 'HealthCare Innovations',
    email: 'ana@hcinnovations.cl', industry: 'Salud', company_size: '10-50', score: 91,
    created_at: '2026-02-28T09:00:00Z',
    proposals: [
      { id: 'prop-6', title: 'Portal de telemedicina', status: 'accepted', created_at: '2026-03-05T08:00:00Z', value: 22000000 },
      { id: 'prop-7', title: 'Sistema de gestion de citas', status: 'accepted', created_at: '2026-03-18T10:00:00Z', value: 7500000 },
      { id: 'prop-8', title: 'Integracion con FONASA/ISAPRE', status: 'sent', created_at: '2026-04-02T13:00:00Z', value: 11000000 },
    ],
  },
  {
    id: 'demo-4', tenant_id: 'demo', name: 'Roberto Silva', company: 'EduPlatform LATAM',
    email: 'roberto@eduplatform.cl', industry: 'Educacion', company_size: '50-200', score: 68,
    created_at: '2026-02-20T16:00:00Z',
    proposals: [
      { id: 'prop-9', title: 'LMS para educacion corporativa', status: 'draft', created_at: '2026-04-08T15:00:00Z', value: 18000000 },
    ],
  },
  {
    id: 'demo-5', tenant_id: 'demo', name: 'Valentina Torres', company: 'FinanzApp SpA',
    email: 'valentina@finanzapp.cl', industry: 'Finanzas', company_size: '10-50', score: 78,
    created_at: '2026-01-15T11:00:00Z',
    proposals: [
      { id: 'prop-10', title: 'Motor de scoring crediticio', status: 'accepted', created_at: '2026-02-10T09:00:00Z', value: 25000000 },
      { id: 'prop-11', title: 'Dashboard regulatorio CMF', status: 'sent', created_at: '2026-03-22T14:00:00Z', value: 14000000 },
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

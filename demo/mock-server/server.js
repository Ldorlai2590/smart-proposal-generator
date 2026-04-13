/**
 * Smart Proposal Generator — Mock Server (Offline Demo)
 * Mocks all API endpoints needed by the wizard. No external services required.
 * Run: npm install && npm start
 */

const express = require('express')
const cors = require('cors')
const { v4: uuidv4 } = require('uuid')

const app = express()
const PORT = 3001

app.use(cors({ origin: '*' }))
app.use(express.json())

// ─── In-memory stores ───────────────────────────────────────────────────────
const mockTenantId = 'demo-tenant-001'

const clients = [
  { id: uuidv4(), tenant_id: mockTenantId, name: 'Carlos Mendoza', company: 'TechCorp LATAM', email: 'carlos@techcorp.lat', industry: 'Tecnología', company_size: '200-500', score: 92, created_at: new Date().toISOString() },
  { id: uuidv4(), tenant_id: mockTenantId, name: 'Ana Gómez', company: 'Bancolombia Digital', email: 'ana.gomez@bancolombia.com', industry: 'Finanzas', company_size: '5000+', score: 88, created_at: new Date().toISOString() },
  { id: uuidv4(), tenant_id: mockTenantId, name: 'Diego Restrepo', company: 'Rappi Growth', email: 'diego@rappi.com', industry: 'eCommerce', company_size: '1000-5000', score: 79, created_at: new Date().toISOString() },
  { id: uuidv4(), tenant_id: mockTenantId, name: 'Valentina Torres', company: 'Falabella Digital', email: 'vtorres@falabella.com', industry: 'Retail', company_size: '5000+', score: 85, created_at: new Date().toISOString() },
  { id: uuidv4(), tenant_id: mockTenantId, name: 'Sebastián Ríos', company: 'Ecopetrol Digital', email: 'srios@ecopetrol.com', industry: 'Energía', company_size: '5000+', score: 71, created_at: new Date().toISOString() },
]

const proposals = []

// ─── Mock proposal content (Spanish) ────────────────────────────────────────
function buildProposalContent(clientName, company, problem) {
  return {
    executiveSummary: `Esta propuesta presenta una solución estratégica de transformación digital para ${company}. Hemos identificado una oportunidad crítica para optimizar sus procesos actuales mediante el uso de inteligencia artificial y automatización avanzada. Nuestra propuesta contempla un enfoque integral que garantiza resultados medibles desde el primer trimestre de implementación, con un ROI proyectado del 340% en los primeros 18 meses.`,

    problem: `${company} enfrenta actualmente ${problem || 'desafíos operativos críticos que limitan su capacidad de escalar'}. Esto se traduce en pérdidas de productividad del 23% mensual, costos operativos elevados y una experiencia del cliente por debajo de los estándares del mercado. Sin una intervención inmediata, el riesgo de perder participación de mercado frente a competidores digitalmente nativos es alto. Nuestro análisis de brechas reveló tres áreas críticas: automatización de procesos, analítica en tiempo real e integración de sistemas legados.`,

    solution: `Proponemos implementar nuestra plataforma de IA propietaria en tres fases. Fase 1: Auditoría y diseño de arquitectura (semanas 1-4). Fase 2: Desarrollo e integración con sistemas existentes de ${company} (semanas 5-14). Fase 3: Despliegue gradual, capacitación del equipo y optimización continua (semanas 15-20). La solución incluye un dashboard ejecutivo en tiempo real, automatización de flujos críticos, y un modelo de IA entrenado específicamente para el contexto de ${company} en el mercado latinoamericano.`,

    scope: `El alcance del proyecto incluye: (1) Análisis y mapeo de procesos actuales, (2) Diseño de arquitectura de solución personalizada, (3) Desarrollo de 8 módulos funcionales, (4) Integración con ERP y CRM existentes, (5) Panel de analítica avanzada con 15 KPIs clave, (6) Capacitación para 50 usuarios finales y 5 administradores, (7) Soporte técnico prioritario durante 6 meses post-lanzamiento, (8) Documentación técnica y manuales de usuario.`,

    timeline: `Semanas 1-2: Kick-off y levantamiento de requerimientos detallados con stakeholders de ${company}. Semanas 3-4: Diseño de arquitectura y aprobación de prototipos. Semanas 5-10: Desarrollo Sprint 1 — módulos core y backend. Semanas 11-14: Desarrollo Sprint 2 — frontend, integraciones y pruebas. Semana 15: UAT con equipo de ${company}. Semanas 16-18: Ajustes post-UAT y hardening de seguridad. Semana 19: Go-live en ambiente de producción. Semana 20: Entrega formal y transferencia de conocimiento.`,

    investment: `La inversión total del proyecto es de USD $48,500, distribuida así: Consultoría estratégica y arquitectura: $8,500. Desarrollo e implementación: $28,000. Integración de sistemas y pruebas: $6,500. Capacitación y documentación: $3,500. Soporte post-lanzamiento (6 meses): $2,000. Condiciones de pago: 30% al inicio del proyecto, 40% al completar la Fase 2, 30% al go-live. Modalidad de contratación: precio fijo por entregables. Garantía de satisfacción: ajustes sin costo adicional durante 60 días post-entrega.`,

    nextSteps: `Para iniciar el proyecto, necesitamos: (1) Firma del acuerdo de confidencialidad (NDA) — tiempo estimado: 1 día. (2) Reunión de kick-off con el equipo técnico y de negocio de ${company} — agendar en los próximos 5 días hábiles. (3) Pago del 30% inicial para comenzar la fase de descubrimiento. (4) Acceso de lectura a los sistemas actuales para el análisis de arquitectura. Nuestro equipo está disponible para una llamada de aclaraciones esta semana. Contáctenos en hola@smartproposal.lat o al +57 300 123 4567.`,
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: 'mock', timestamp: new Date().toISOString() })
})

// Clients
app.get('/api/clients', (req, res) => {
  res.json({ data: clients, total: clients.length })
})

app.post('/api/clients', (req, res) => {
  const { name, company, email, industry, company_size } = req.body
  const newClient = {
    id: uuidv4(),
    tenant_id: mockTenantId,
    name: name || 'Nuevo Cliente',
    company: company || 'Empresa Demo',
    email: email || 'demo@empresa.com',
    industry: industry || 'Tecnología',
    company_size: company_size || '50-200',
    score: Math.floor(Math.random() * 30) + 60,
    created_at: new Date().toISOString(),
  }
  clients.push(newClient)
  res.status(201).json({ data: newClient })
})

app.get('/api/clients/:id', (req, res) => {
  const client = clients.find(c => c.id === req.params.id)
  if (!client) return res.status(404).json({ error: 'Client not found' })
  res.json({ data: client })
})

// Proposals
app.get('/api/proposals', (req, res) => {
  res.json({ data: proposals, total: proposals.length })
})

// AI Streaming — Server-Sent Events
app.post('/api/proposals/stream', async (req, res) => {
  const { clientId, context } = req.body
  const client = clients.find(c => c.id === clientId) || clients[0]
  const content = buildProposalContent(client.name, client.company, context?.problem)

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const sendWords = (sectionKey, text) => {
    return new Promise(resolve => {
      const words = text.split(' ')
      let i = 0
      const interval = setInterval(() => {
        if (i >= words.length) {
          clearInterval(interval)
          resolve()
          return
        }
        const partial = words.slice(0, i + 1).join(' ')
        const payload = JSON.stringify({ [sectionKey]: partial })
        res.write(`data: ${payload}\n\n`)
        i++
      }, 25)
    })
  }

  const sections = Object.entries(content)
  for (const [key, text] of sections) {
    await sendWords(key, text)
    // Small pause between sections
    await new Promise(r => setTimeout(r, 200))
  }

  // Save proposal to memory
  const newProposal = {
    id: uuidv4(),
    tenant_id: mockTenantId,
    client_id: clientId || clients[0].id,
    title: `Propuesta para ${client.company}`,
    status: 'draft',
    sections: content,
    context: context || {},
    tokens_used: 1842,
    model: 'claude-sonnet-4-5',
    created_at: new Date().toISOString(),
  }
  proposals.push(newProposal)

  res.write(`data: [DONE]\n\n`)
  res.end()
})

// Export
app.post('/api/proposals/:id/export', (req, res) => {
  const { format } = req.body
  res.json({
    success: true,
    format: format || 'pdf',
    downloadUrl: `/mock-export.${format || 'pdf'}`,
    message: `Propuesta exportada como ${(format || 'PDF').toUpperCase()} exitosamente`,
  })
})

// Onboarding
app.post('/api/onboarding', (req, res) => {
  res.json({ success: true, tenantId: mockTenantId, message: 'Tenant creado en modo demo' })
})

// Billing
app.post('/api/billing/create-setup-intent', (req, res) => {
  res.json({ clientSecret: 'pi_mock_secret_demo', mode: 'mock' })
})

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Smart Proposal Mock Server running at http://localhost:${PORT}`)
  console.log(`   Health check: http://localhost:${PORT}/health`)
  console.log(`   Clients API:  http://localhost:${PORT}/api/clients`)
  console.log(`   Stream API:   POST http://localhost:${PORT}/api/proposals/stream`)
  console.log('\n   Mode: OFFLINE DEMO — no external services required\n')
})

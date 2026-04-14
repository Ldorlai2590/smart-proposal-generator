import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod/v4'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

const ProposalSectionSchema = z.object({
  resumenEjecutivo: z.string().describe('Resumen ejecutivo de la propuesta'),
  problema: z.string().describe('Descripción del problema del cliente'),
  serviciosPropuestos: z.string().describe('Descripción de los servicios propuestos incluyendo detalles de cada uno'),
  alcancePorServicio: z.string().describe('Alcance detallado por cada servicio con entregables específicos'),
  timeline: z.string().describe('Cronograma estimado con hitos clave'),
  inversion: z.string().describe('Inversión requerida con tabla consolidada de servicios (one-time, monthly, total)'),
  casoDeExito: z.string().describe('Caso de éxito o estudio de caso relevante para construir credibilidad').optional(),
  proximosPasos: z.string().describe('Próximos pasos concretos'),
})

const RequestSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  company: z.string(),
  industry: z.string(),
  problema: z.string(),
  services: z.array(z.string()).optional(),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  tono: z.enum(['formal', 'consultivo', 'directo']).default('consultivo'),
})

export async function POST(req: Request) {
  if (!DEMO_MODE) {
    const { auth } = await import('@clerk/nextjs/server')
    const session = await auth()
    if (!session.userId || !session.orgId) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Gate: trial vencido o cuota agotada → 402 Payment Required
    const { getTrialStatus } = await import('@/lib/trial')
    const trial = await getTrialStatus(session.orgId)
    if (!trial || !trial.canGenerateProposals) {
      return new Response(
        JSON.stringify({
          error: 'trial_expired_or_quota_exceeded',
          stage: trial?.stage ?? 'unknown',
          daysLeft: trial?.daysLeft ?? 0,
          proposalsUsed: trial?.proposalsUsed ?? 0,
          proposalsQuota: trial?.proposalsQuota ?? 0,
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  const body = await req.json()
  const input = RequestSchema.parse(body)

  const system = `Eres un experto consultor de negocios especializado en propuestas B2B multi-servicio para el mercado LATAM.

Genera propuestas persuasivas, estructuradas y personalizadas que incluyen múltiples servicios. Usa un tono ${input.tono}.
Cada sección debe ser concisa pero completa. Personaliza con datos reales del cliente.

ESPECIALIDAD: Propuestas con múltiples servicios (ej: Paid Media + Landing Page + Diseño de Anuncios) con:
- Descripción individual de cada servicio
- Alcance específico por servicio con entregables concretos
- Tabla consolidada de inversión (one-time, monthly, total por servicio)
- Caso de éxito para construir credibilidad

Empresa: ${input.company} | Industria: ${input.industry}`

  const servicesText = input.services && input.services.length > 0
    ? `Servicios a incluir en la propuesta:\n${input.services.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
    : ''

  const prompt = `Genera una propuesta comercial B2B multi-servicio completa para ${input.clientName} de ${input.company}.

Problema a resolver: ${input.problema}

${servicesText}

${input.budget ? `Presupuesto estimado total: ${input.budget}` : ''}
${input.timeline ? `Timeline deseado: ${input.timeline}` : ''}

IMPORTANTE: Para cada servicio, incluye:
1. Descripción clara del servicio y su beneficio
2. Alcance específico con entregables concretos
3. Duración estimada
4. Precio (one-time si aplica, monthly si aplica)

Consolida todo en una tabla final de inversión mostrando el total por servicio y el total general.`

  const result = streamObject({
    model: anthropic('claude-sonnet-4-5'),
    schema: ProposalSectionSchema,
    messages: [
      {
        role: 'system',
        content: system,
        experimental_providerMetadata: {
          anthropic: { cacheControl: { type: 'ephemeral' } },
        },
      },
      { role: 'user', content: prompt },
    ],
  })

  // Save to PostgreSQL after streaming completes (non-blocking, skip in demo)
  if (!DEMO_MODE) {
    const apiUrl = process.env.API_URL ?? 'http://localhost:8000'
    result.object.then(async (sections) => {
      try {
        const { incrementProposalUsage } = await import('@/lib/trial')
        await incrementProposalUsage('').catch(() => {})
        const createRes = await fetch(`${apiUrl}/proposals/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: input.clientId, title: `Propuesta para ${input.company}`, context: { problema: input.problema, services: input.services, budget: input.budget, timeline: input.timeline, tono: input.tono } }),
        })
        if (createRes.ok) {
          const { id } = await createRes.json()
          await fetch(`${apiUrl}/proposals/${id}/sections`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sections, model: 'claude-sonnet-4-5' }) })
        }
      } catch { console.error('[stream] Failed to save proposal to DB') }
    })
  }

  return result.toTextStreamResponse()
}

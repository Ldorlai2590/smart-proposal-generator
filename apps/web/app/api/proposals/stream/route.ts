import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod/v4'
import { checkLimit, getClientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

// Hard upper bound on the full generation. Anthropic streams can hang on
// upstream errors; this guarantees a client-visible failure within 60s.
const STREAM_TIMEOUT_MS = 60_000

// 14-section schema per Smart Proposal v2 spec
const ProposalSectionSchema = z.object({
  portada: z.string().describe('Portada con título atractivo, nombre del cliente y tagline en HTML'),
  contextoCliente: z.string().describe('Contexto del cliente: industria, tamaño, situación actual'),
  diagnostico: z.string().describe('Diagnóstico del problema con datos específicos en HTML (use <ul>)'),
  oportunidad: z.string().describe('Oportunidad detectada con métricas proyectadas'),
  solucion: z.string().describe('Solución propuesta concreta'),
  alcance: z.string().describe('Alcance detallado por servicio'),
  incluyeNoIncluye: z.string().describe('Lista clara de qué incluye y qué no en HTML'),
  metodologia: z.string().describe('Metodología de trabajo, sprints, comunicación'),
  cronograma: z.string().describe('Cronograma con hitos por mes/semana'),
  casosExito: z.string().describe('Caso de éxito relevante con resultados medibles'),
  diferenciadores: z.string().describe('Por qué nosotros — diferenciadores únicos'),
  inversion: z.string().describe('Inversión con tabla HTML de servicios y total'),
  proximosPasos: z.string().describe('Próximos pasos concretos numerados'),
  ctaFinal: z.string().describe('Call to action final motivador'),
})

const ServiceSchema = z.object({
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  discount: z.number().default(0),
  billing: z.string(),
})

const RequestSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  company: z.string(),
  industry: z.string(),
  problema: z.string(),
  // v2 fields (all optional for backwards compat)
  objectives: z.string().optional(),
  currentProblems: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  services: z.union([z.array(z.string()), z.array(ServiceSchema)]).optional(),
  budget: z.string().optional(),
  startDate: z.string().optional(),
  timeline: z.string().optional(),
  formality: z.enum(['ejecutivo', 'cercano', 'premium', 'tecnico']).optional(),
  designTemplate: z.enum(['minimalista', 'premium', 'corporativo', 'creativo']).optional(),
  tono: z.enum(['formal', 'consultivo', 'directo']).default('consultivo'),
})

export async function POST(req: Request) {
  const log = logger.withRequestId(req)
  const start = Date.now()

  // --- Auth & quota gate ---------------------------------------------------
  let tenantId: string
  try {
    const { requireAuth } = await import('@/lib/auth')
    const session = await requireAuth()
    tenantId = session.tenantId
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  const { getTrialStatus } = await import('@/lib/trial')
  const trial = await getTrialStatus(tenantId)
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

  // --- Body parsing + validation -------------------------------------------
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_json', message: 'Body must be valid JSON.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // safeParse — never throw on user input.
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    log.warn('stream_bad_request', { issues: parsed.error.issues })
    return new Response(
      JSON.stringify({
        error: 'invalid_request',
        message: 'Request body failed validation.',
        issues: parsed.error.issues,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  const input = parsed.data

  log.info('stream_start', {
    clientId: input.clientId,
    company: input.company,
    industry: input.industry,
    services: input.services?.length ?? 0,
  })

  const formalityGuide: Record<string, string> = {
    ejecutivo: 'Tono ejecutivo para C-level. Frases cortas, foco en impacto de negocio.',
    cercano: 'Tono cercano y conversacional. Como un asesor de confianza.',
    premium: 'Tono premium, exclusivo, que comunique excelencia y diferenciación.',
    tecnico: 'Tono técnico riguroso, con detalles de implementación.',
  }

  const designGuide: Record<string, string> = {
    minimalista: 'Diseño limpio. Mucho whitespace en HTML, listas cortas.',
    premium: 'Diseño premium con tipografías serif, iconos elegantes en HTML.',
    corporativo: 'Diseño corporativo formal, estructurado, con tablas y listas.',
    creativo: 'Diseño creativo con énfasis visual, iconos, color, modernidad.',
  }

  const system = `Eres un experto consultor de negocios especializado en propuestas B2B multi-servicio para el mercado LATAM (Chile, México, Colombia).

REGLAS:
- Genera propuestas persuasivas, estructuradas y personalizadas que cierren negocios.
- Tono ${input.tono}. ${input.formality ? formalityGuide[input.formality] : ''}
- Estilo de diseño ${input.designTemplate ?? 'minimalista'}. ${input.designTemplate ? designGuide[input.designTemplate] : ''}
- Personaliza con datos REALES del cliente (no inventes números o casos).
- Output en HTML válido y semántico (<p>, <ul>, <li>, <strong>, <table>, <h3>).
- Cada sección debe ser concisa pero completa (150-300 palabras máximo).

ESTRUCTURA DE 14 SECCIONES (genera todas, en orden):
1. portada — Título atractivo + nombre cliente + tagline (corto)
2. contextoCliente — Industria, situación actual, contexto de mercado
3. diagnostico — Problema con datos específicos (use <ul>)
4. oportunidad — Oportunidad detectada con métricas proyectadas (3 highlights)
5. solucion — Solución concreta en 3 frentes
6. alcance — Alcance detallado por servicio
7. incluyeNoIncluye — Lista clara: 5+ items que incluye, 3+ que NO
8. metodologia — Cómo trabajamos (sprints, comunicación, KPIs)
9. cronograma — Hitos por mes/semana
10. casosExito — 1 caso relevante con métricas reales
11. diferenciadores — Por qué nosotros (3-5 diferenciadores)
12. inversion — Tabla HTML con servicios + total. Formato CLP/USD según contexto.
13. proximosPasos — Lista numerada de pasos concretos
14. ctaFinal — Call to action motivador (2-3 frases)

ESPECIALIDAD: Propuestas multi-servicio. Cada servicio con descripción + alcance + entregables + precio.

Empresa: ${input.company} | Industria: ${input.industry}`

  // Build services text
  const servicesText = (() => {
    if (!input.services || input.services.length === 0) return ''
    if (typeof input.services[0] === 'string') {
      return `Servicios:\n${(input.services as string[]).map((s, i) => `${i + 1}. ${s}`).join('\n')}`
    }
    type Svc = { name: string; price: number; quantity: number; discount: number; billing: string }
    return `Servicios seleccionados:\n${(input.services as Svc[]).map((s, i) => `${i + 1}. ${s.name} — $${s.price}${s.billing === 'monthly' ? '/mes' : ''} × ${s.quantity}${s.discount > 0 ? ` (${s.discount}% desc)` : ''}`).join('\n')}`
  })()

  const urgencyText = input.urgency ? `Urgencia: ${input.urgency}` : ''
  const objectivesText = input.objectives ? `Objetivos: ${input.objectives}` : ''
  const currentProblemsText = input.currentProblems ? `Problemas detectados: ${input.currentProblems}` : ''

  const prompt = `Genera una propuesta comercial B2B multi-servicio COMPLETA (14 secciones) para ${input.clientName} de ${input.company}.

Problema central: ${input.problema}
${objectivesText}
${currentProblemsText}
${urgencyText}

${servicesText}

${input.budget ? `Presupuesto estimado: ${input.budget}` : ''}
${input.startDate ? `Fecha esperada inicio: ${input.startDate}` : ''}
${input.timeline ? `Timeline deseado: ${input.timeline}` : ''}

IMPORTANTE:
- En la sección "inversion", incluye tabla HTML con cada servicio (precio, cantidad, descuento, subtotal) y un total al final.
- En "casosExito", inventa un caso plausible si no hay info real (cliente similar, problema similar, resultado medible).
- En "ctaFinal", invita a coordinar reunión de 15 min con sentido de urgencia sutil.`

  // --- LLM call wrapped in try/catch + timeout -----------------------------
  try {
    const result = streamObject({
      model: anthropic('claude-sonnet-4-5'),
      schema: ProposalSectionSchema,
      abortSignal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
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

    // Post-stream: persist usage + proposal record
    const apiUrl = process.env.API_URL ?? 'http://localhost:8000'
    result.object
      .then(async (sections) => {
        try {
          const { incrementProposalUsage } = await import('@/lib/trial')
          await incrementProposalUsage(tenantId).catch(() => {})
          const createRes = await fetch(`${apiUrl}/proposals/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: input.clientId,
              title: `Propuesta para ${input.company}`,
              context: {
                problema: input.problema,
                services: input.services,
                budget: input.budget,
                timeline: input.timeline,
                tono: input.tono,
              },
            }),
          })
          if (createRes.ok) {
            const { id } = await createRes.json()
            await fetch(`${apiUrl}/proposals/${id}/sections`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sections, model: 'claude-sonnet-4-5' }),
            })
          }
          log.info('stream_persisted', { clientId: input.clientId, durationMs: Date.now() - start })
        } catch (err) {
          log.error('stream_persist_failed', { err: err instanceof Error ? err.message : String(err) })
        }
      })
      .catch((err) => {
        log.error('stream_failed_post', {
          err: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - start,
        })
      })

    return result.toTextStreamResponse()
  } catch (err) {
    // Synchronous errors from streamObject (bad config, provider init, etc).
    // Timeout/abort errors surface via the abortSignal as AbortError.
    const isTimeout =
      err instanceof Error &&
      (err.name === 'AbortError' || err.name === 'TimeoutError')
    log.error('stream_failed', {
      err: err instanceof Error ? err.message : String(err),
      timeout: isTimeout,
      durationMs: Date.now() - start,
    })
    return new Response(
      JSON.stringify({
        error: 'generation_failed',
        message: isTimeout
          ? 'La generación tardó demasiado. Intenta nuevamente.'
          : 'No pudimos generar la propuesta. Intenta nuevamente en unos segundos.',
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

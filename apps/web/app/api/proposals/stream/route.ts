import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod/v4'
import { checkLimit, getClientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

// Hard upper bound on the full generation. Anthropic streams can hang on
// upstream errors; this guarantees a client-visible failure within 60s.
const STREAM_TIMEOUT_MS = 60_000

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

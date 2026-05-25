import { streamText } from 'ai'
import { openrouter } from '@/lib/openrouter'
import { z } from 'zod/v4'
import { checkLimit, getClientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import type { ProposalSections } from '@/lib/schemas/proposal'

// Vercel: bump function timeout so the full streaming budget is respected.
// Default nodejs runtime times out at 10s which kills streams mid-generation.
// 120s requires Vercel Pro; on Hobby the hard cap is 60s — see word-count limits below.
export const runtime = 'nodejs'
export const maxDuration = 120

// Hard upper bound on the full generation. Anthropic streams can hang on
// upstream errors; this guarantees a client-visible failure within the timeout.
// Set 10s below maxDuration so the function can still return a clean error response.
const STREAM_TIMEOUT_MS = 110_000

// Rate limit: 3 proposal generations per minute per IP.
// Anthropic stream costs $$, this caps blast radius if an attacker
// (or buggy client retry loop) hammers the endpoint.
const RATE_LIMIT_KEY = 'proposals:stream'
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_SEC = 60

// streamText replaces streamObject — OpenRouter's OpenAI-compatible tool-calling
// mode silently produces 0 bytes for Anthropic models. streamText + explicit JSON
// prompt is simpler and works with any OpenRouter model.

const ServiceSchema = z.object({
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  discount: z.number().default(0),
  billing: z.string(),
})

const WebsiteAnalysisSchema = z.object({
  business_model: z.string().optional(),
  value_proposition: z.string().optional(),
  target_audience: z.string().optional(),
  key_differentiators: z.array(z.string()).optional(),
  opportunities: z.array(z.string()).optional(),
  pain_points: z.array(z.string()).optional(),
  communication_tone: z.string().optional(),
  executive_summary: z.string().optional(),
})

const RequestSchema = z.object({
  clientId: z.string().max(200),
  clientName: z.string().max(200),
  company: z.string().max(200),
  industry: z.string().max(100),
  problema: z.string().min(20, 'Mínimo 20 caracteres').max(2000, 'Máximo 2000 caracteres'),
  // v2 fields (all optional for backwards compat)
  objectives: z.string().max(1000).optional(),
  currentProblems: z.string().max(1000).optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  services: z.union([z.array(z.string()), z.array(ServiceSchema)]).optional(),
  budget: z.string().max(100).optional(),
  startDate: z.string().max(50).optional(),
  timeline: z.string().max(100).optional(),
  formality: z.enum(['ejecutivo', 'cercano', 'premium', 'tecnico']).optional(),
  designTemplate: z.enum(['minimalista', 'premium', 'corporativo', 'creativo']).optional(),
  tono: z.enum(['formal', 'consultivo', 'directo']).default('consultivo'),
  websiteAnalysis: WebsiteAnalysisSchema.optional(),
})

export async function POST(req: Request) {
  const log = logger.withRequestId(req)
  const start = Date.now()

  // --- Rate limit (per IP, sliding window) ---------------------------------
  // Applied BEFORE auth so unauthenticated probe traffic also counts.
  const ip = getClientIp(req)
  const rl = checkLimit(ip, RATE_LIMIT_KEY, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SEC)
  if (!rl.allowed) {
    log.warn('stream_rate_limited', { ip, retryAfter: rl.retryAfter })
    return new Response(
      JSON.stringify({
        error: 'rate_limited',
        message: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.',
        retryAfter: rl.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rl.resetAt.toISOString(),
        },
      }
    )
  }

  // --- Auth & quota gate ---------------------------------------------------
  let tenantId: string
  try {
    const { requireAuth } = await import('@/lib/auth')
    const session = await requireAuth()
    tenantId = session.tenantId
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const { getTrialStatus } = await import('@/lib/trial')
    const trial = await getTrialStatus(tenantId)
    if (trial && !trial.canGenerateProposals) {
      return new Response(
        JSON.stringify({
          error: 'trial_expired_or_quota_exceeded',
          stage: trial.stage,
          daysLeft: trial.daysLeft,
          proposalsUsed: trial.proposalsUsed,
          proposalsQuota: trial.proposalsQuota,
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (dbErr) {
    // DB unreachable (e.g. Vercel serverless → Supabase direct connection).
    // Fail open so the demo always generates; usage tracking is best-effort.
    log.warn('stream_trial_check_failed', {
      err: dbErr instanceof Error ? dbErr.message : String(dbErr),
    })
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

  // Build website analysis context block (only emitted when there's actual data)
  const websiteContext = (() => {
    const wa = input.websiteAnalysis
    if (!wa) return ''
    const lines: string[] = []
    if (wa.executive_summary) lines.push(`Resumen: ${wa.executive_summary}`)
    if (wa.business_model) lines.push(`Modelo de negocio: ${wa.business_model}`)
    if (wa.value_proposition) lines.push(`Propuesta de valor: ${wa.value_proposition}`)
    if (wa.target_audience) lines.push(`Público objetivo: ${wa.target_audience}`)
    if (wa.key_differentiators?.length) lines.push(`Diferenciadores: ${wa.key_differentiators.join(', ')}`)
    if (wa.opportunities?.length) lines.push(`Oportunidades detectadas: ${wa.opportunities.join('; ')}`)
    if (wa.pain_points?.length) lines.push(`Problemas que resuelven: ${wa.pain_points.join('; ')}`)
    if (wa.communication_tone) lines.push(`Tono de marca: ${wa.communication_tone}`)
    if (lines.length === 0) return ''
    return (
      '\n\nCONTEXTO DEL SITIO WEB DEL CLIENTE (analizado por IA):\n' +
      lines.join('\n') +
      '\nUsa este contexto para personalizar PROFUNDAMENTE cada sección de la propuesta.'
    )
  })()

  const system = `Eres un experto consultor de negocios especializado en propuestas B2B multi-servicio para el mercado LATAM (Chile, México, Colombia).

REGLAS:
- Genera propuestas persuasivas, estructuradas y personalizadas que cierren negocios.
- Tono ${input.tono}. ${input.formality ? formalityGuide[input.formality] : ''}
- Estilo de diseño ${input.designTemplate ?? 'minimalista'}. ${input.designTemplate ? designGuide[input.designTemplate] : ''}
- Personaliza con datos REALES del cliente (no inventes números o casos).
- Output en HTML válido y semántico (<p>, <ul>, <li>, <strong>, <table>, <h3>).
- Cada sección: MÁXIMO 150 palabras. Sin excepción. Prioriza claridad sobre extensión.

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

Empresa: ${input.company} | Industria: ${input.industry}${websiteContext}`

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
    const result = streamText({
      model: openrouter('anthropic/claude-3-5-haiku'),
      maxTokens: 8000,
      abortSignal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
      system: system + '\n\nFORMATO DE RESPUESTA: Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin bloques de código, sin texto adicional) con exactamente estas 14 claves: portada, contextoCliente, diagnostico, oportunidad, solucion, alcance, incluyeNoIncluye, metodologia, cronograma, casosExito, diferenciadores, inversion, proximosPasos, ctaFinal.',
      prompt,
    })

    // Pipe textStream manually so errors are logged before the writer closes.
    // result.object.catch() fires too late (after response body ends) — Vercel
    // may freeze the function before that promise settles.
    const encoder = new TextEncoder()
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
    const writer = writable.getWriter()

    ;(async () => {
      try {
        for await (const chunk of result.textStream as AsyncIterable<string>) {
          await writer.write(encoder.encode(chunk))
        }
        // Stream completed — increment usage
        try {
          const { incrementProposalUsage } = await import('@/lib/trial')
          await incrementProposalUsage(tenantId).catch(() => {})
          log.info('stream_completed', { clientId: input.clientId, durationMs: Date.now() - start })
        } catch (usageErr) {
          log.error('stream_usage_failed', { err: usageErr instanceof Error ? usageErr.message : String(usageErr) })
        }
      } catch (pipeErr) {
        log.error('stream_pipe_error', {
          err: pipeErr instanceof Error ? pipeErr.message : String(pipeErr),
          name: pipeErr instanceof Error ? pipeErr.name : 'unknown',
          durationMs: Date.now() - start,
        })
      } finally {
        writer.close().catch(() => {})
      }
    })()

    return new Response(readable, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
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

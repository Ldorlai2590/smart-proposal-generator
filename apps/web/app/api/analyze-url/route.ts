import {
  generateObject,
  jsonSchema,
  APICallError,
  NoObjectGeneratedError,
  TypeValidationError,
} from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod/v4'
import { requireAuth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { checkLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

// Rate limit: 10 URL analyses per minute per IP (less sensitive than proposal gen but still AI-backed)
const RATE_LIMIT_KEY = 'analyze-url'
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_SEC = 60

// Block private/internal hosts — covers IPv4 private ranges, IPv6 loopback/link-local/ULA,
// cloud metadata endpoints. DNS rebinding is a known residual risk; mitigated by strict
// Content-Type/size guards so a rebinding attack yields at most 8 KB of plaintext.
const BLOCKED_HOSTS =
  /^(localhost|127\.|0\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1|fe80:|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:|169\.254\.)/i

const BLOCKED_HOSTNAMES = new Set(['metadata.google.internal', 'metadata.internal'])

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024 // 5 MB guard before buffering

const AnalysisSchema = z.object({
  business_model: z.string().describe('Modelo de negocio principal en 1 frase'),
  value_proposition: z.string().describe('Propuesta de valor principal en 1-2 frases'),
  target_audience: z.string().describe('Público objetivo principal'),
  key_differentiators: z.array(z.string()).describe('3-5 diferenciadores clave'),
  pain_points: z.array(z.string()).describe('2-3 problemas que el negocio resuelve'),
  opportunities: z.array(z.string()).describe('2-3 oportunidades de mejora o crecimiento detectadas'),
  communication_tone: z
    .enum(['formal', 'casual', 'tecnico', 'aspiracional', 'directo'])
    .describe('Tono de comunicación predominante de la marca'),
  executive_summary: z
    .string()
    .describe('Resumen ejecutivo en 2-3 frases para personalizar una propuesta B2B'),
})

export type WebsiteAnalysis = z.infer<typeof AnalysisSchema>

export async function POST(req: Request) {
  const log = logger.withRequestId(req)

  // Rate limit first — before auth so probes also count
  const ip = getClientIp(req)
  const rl = checkLimit(ip, RATE_LIMIT_KEY, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SEC)
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', message: 'Demasiadas solicitudes. Intenta en unos segundos.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.retryAfter),
        },
      }
    )
  }

  try {
    await requireAuth()
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_json' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const parsed = z
    .object({
      url: z.string().url().max(2000),
      company: z.string().max(200).optional(),
      industry: z.string().max(100).optional(),
    })
    .safeParse(body)

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'invalid_request', issues: parsed.error.issues }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { url, company, industry } = parsed.data

  // SSRF: only allow public https/http hosts
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_url' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
    return new Response(
      JSON.stringify({ error: 'protocol_not_allowed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const hostname = parsedUrl.hostname.toLowerCase()
  if (BLOCKED_HOSTS.test(hostname) || BLOCKED_HOSTNAMES.has(hostname)) {
    return new Response(
      JSON.stringify({ error: 'host_not_allowed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Fetch page content with Content-Type + size guards
  let pageContent = ''
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SmartProposalBot/1.0; +https://smartproposal.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    // Reject non-HTML responses to prevent reading binary data
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/') && !contentType.includes('application/xhtml')) {
      throw new Error(`Non-HTML content-type: ${contentType.split(';')[0]}`)
    }

    // Reject oversized responses before buffering
    const contentLength = Number(res.headers.get('content-length') ?? 0)
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new Error('Response too large')
    }

    const html = await res.text()
    if (html.length > MAX_RESPONSE_BYTES) throw new Error('Response too large')

    pageContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000)
  } catch (err) {
    log.warn('analyze_url_fetch_failed', {
      host: parsedUrl.hostname, // log hostname only, not full URL with path/params
      err: err instanceof Error ? err.message : String(err),
    })
    return new Response(
      JSON.stringify({
        error: 'fetch_failed',
        message: 'No se pudo acceder al sitio web. Verifica que la URL sea pública y accesible.',
      }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // AI analysis with Haiku (fast + cheap for extraction)
  try {
    // Use jsonSchema() + z.toJSONSchema() to bypass zod-to-json-schema@3.x incompatibility with Zod v4.
    // Without this, generateObject sends an empty {} schema to Anthropic, which returns unstructured data.
    const { object } = await generateObject<WebsiteAnalysis>({
      model: anthropic('claude-haiku-4-5'),
      schema: jsonSchema<WebsiteAnalysis>(
        z.toJSONSchema(AnalysisSchema) as Parameters<typeof jsonSchema>[0],
        {
          validate: (value) => {
            const result = AnalysisSchema.safeParse(value)
            if (result.success) return { success: true as const, value: result.data }
            return { success: false as const, error: result.error as Error }
          },
        },
      ),
      prompt: `Analiza este sitio web de la empresa "${company ?? 'desconocida'}" (industria: ${industry ?? 'no especificada'}) y extrae insights estructurados para personalizar una propuesta comercial B2B en LATAM.

Contenido del sitio:
${pageContent}

Extrae información precisa. Si algo no está en el contenido, indícalo brevemente en lugar de inventar.`,
    })

    log.info('analyze_url_success', { company, host: parsedUrl.hostname })
    return new Response(JSON.stringify(object), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    // Build a rich error context so Vercel logs contain enough to diagnose without
    // a local repro. Each AI SDK error subclass carries fields beyond .message.
    const errCtx: Record<string, unknown> = {
      errName: err instanceof Error ? err.name : typeof err,
      errMsg: err instanceof Error ? err.message : String(err),
    }

    if (APICallError.isInstance(err)) {
      errCtx.statusCode = err.statusCode
      errCtx.responseBody = err.responseBody?.slice(0, 500) // truncate to stay log-friendly
      errCtx.isRetryable = err.isRetryable
    } else if (NoObjectGeneratedError.isInstance(err)) {
      errCtx.finishReason = err.finishReason
      errCtx.rawText = err.text?.slice(0, 500) // first 500 chars of raw model output
      errCtx.responseId = err.response?.id
    } else if (TypeValidationError.isInstance(err)) {
      errCtx.validationCause = err.cause instanceof Error ? err.cause.message : String(err.cause)
      errCtx.badValue = JSON.stringify(err.value)?.slice(0, 500)
    }

    log.error('analyze_url_ai_failed', errCtx)
    return new Response(
      JSON.stringify({ error: 'analysis_failed', message: 'No se pudo analizar el sitio.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

import { auth } from '@clerk/nextjs/server'
import { z } from 'zod/v4'

// ─── Validation schemas ───────────────────────────────────────────────────────

const SectionsSchema = z.object({
  resumenEjecutivo: z.string().optional(),
  problema: z.string().optional(),
  solucion: z.string().optional(),
  alcance: z.string().optional(),
  timeline: z.string().optional(),
  inversion: z.string().optional(),
  proximosPasos: z.string().optional(),
})

const ClientSchema = z.object({
  id: z.string().optional().default(''),
  name: z.string(),
  company: z.string(),
  email: z.string().optional().default(''),
  industry: z.string().optional().default(''),
})

const ExportRequestSchema = z.object({
  sections: SectionsSchema,
  client: ClientSchema,
  format: z.enum(['pdf', 'docx']),
})

// ─── Content-type & extension helpers ────────────────────────────────────────

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function expectedContentType(format: 'pdf' | 'docx'): string {
  return format === 'pdf' ? 'application/pdf' : DOCX_MIME
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  // Auth guard
  const { userId } = await auth()
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Parse & validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = ExportRequestSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', details: parsed.error.issues }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { sections, client, format } = parsed.data

  // ── Call FastAPI ────────────────────────────────────────────────────────────
  const fastApiUrl = process.env.FASTAPI_URL ?? 'http://localhost:8000'

  let apiResponse: Response
  try {
    apiResponse = await fetch(`${fastApiUrl}/api/v1/exports/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections, client, format }),
    })
  } catch (err) {
    console.error('[export] FastAPI unreachable:', err)
    return new Response(
      JSON.stringify({
        error: 'Export service unavailable. Please try again later.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text().catch(() => 'Unknown error')
    console.error(`[export] FastAPI error ${apiResponse.status}:`, errorText)
    return new Response(
      JSON.stringify({ error: `Export failed: ${apiResponse.statusText}` }),
      {
        status: apiResponse.status >= 500 ? 502 : apiResponse.status,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  // ── Stream file back to the browser ────────────────────────────────────────
  const fileBytes = await apiResponse.arrayBuffer()

  // FastAPI may return text/plain as fallback when DocuForge is not configured
  const upstreamContentType =
    apiResponse.headers.get('Content-Type') ?? expectedContentType(format)

  const contentDisposition =
    apiResponse.headers.get('Content-Disposition') ??
    `attachment; filename="propuesta-${client.company.toLowerCase().replace(/\s+/g, '-') || 'export'}.${format}"`

  return new Response(fileBytes, {
    status: 200,
    headers: {
      'Content-Type': upstreamContentType,
      'Content-Disposition': contentDisposition,
    },
  })
}

import { auth } from '@clerk/nextjs/server'
import { z } from 'zod/v4'

// ─── Validation schema ────────────────────────────────────────────────────────

const ExportRequestSchema = z.object({
  proposalId: z.string().min(1),
  format: z.enum(['pdf', 'docx', 'email']),
  sections: z.record(z.string(), z.string()),
  recipientEmail: z.string().email().optional(),
})

type ExportRequest = z.infer<typeof ExportRequestSchema>

// ─── Section order & labels ───────────────────────────────────────────────────

const SECTION_META: { key: string; label: string }[] = [
  { key: 'resumenEjecutivo', label: 'Resumen Ejecutivo' },
  { key: 'problema', label: 'El Problema' },
  { key: 'serviciosPropuestos', label: 'Servicios Propuestos' },
  { key: 'alcancePorServicio', label: 'Alcance por Servicio' },
  { key: 'timeline', label: 'Cronograma' },
  { key: 'inversion', label: 'Inversión' },
  { key: 'casoDeExito', label: 'Caso de Éxito' },
  { key: 'proximosPasos', label: 'Próximos Pasos' },
]

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildProposalHTML(sections: Record<string, string>): string {
  const sectionBlocks = SECTION_META
    .filter(({ key }) => sections[key])
    .map(
      ({ key, label }) => `
    <section class="proposal-section">
      <h2>${label}</h2>
      <div class="section-body">${sections[key]}</div>
    </section>`,
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Propuesta Comercial</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a2e;
      background: #ffffff;
    }

    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 48px 56px;
    }

    /* ── Header ── */
    .proposal-header {
      border-bottom: 3px solid #1D9E75;
      padding-bottom: 24px;
      margin-bottom: 40px;
    }

    .proposal-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1D9E75;
      letter-spacing: -0.5px;
    }

    .proposal-header .subtitle {
      margin-top: 6px;
      font-size: 13px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* ── Sections ── */
    .proposal-section {
      margin-bottom: 36px;
      page-break-inside: avoid;
    }

    .proposal-section h2 {
      font-size: 16px;
      font-weight: 700;
      color: #1D9E75;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-left: 4px solid #1D9E75;
      padding-left: 12px;
      margin-bottom: 12px;
    }

    .section-body {
      padding-left: 16px;
      color: #374151;
    }

    .section-body p { margin-bottom: 8px; }
    .section-body ul, .section-body ol { padding-left: 20px; margin-bottom: 8px; }
    .section-body li { margin-bottom: 4px; }
    .section-body strong { color: #111827; }

    /* ── Footer ── */
    .proposal-footer {
      margin-top: 48px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
    }

    /* ── Print / PDF ── */
    @media print {
      body { font-size: 12px; }
      .page { padding: 32px 40px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="proposal-header">
      <h1>Propuesta Comercial</h1>
      <p class="subtitle">Generada con Smart Proposal Generator</p>
    </header>

    <main>
      ${sectionBlocks}
    </main>

    <footer class="proposal-footer">
      <p>Este documento es confidencial y fue generado exclusivamente para el destinatario indicado.</p>
      <p>Smart Proposal Generator &mdash; &copy; ${new Date().getFullYear()}</p>
    </footer>
  </div>
</body>
</html>`
}

// ─── JSON response helper ─────────────────────────────────────────────────────

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ─── Export handlers ──────────────────────────────────────────────────────────

async function handlePDF(
  input: ExportRequest,
  _orgId: string,
): Promise<Response> {
  const docuforgeKey = process.env.DOCUFORGE_API_KEY
  if (!docuforgeKey || docuforgeKey === 'df_...') {
    return jsonResponse({ error: 'PDF export is not configured.' }, 503)
  }

  const html = buildProposalHTML(input.sections)

  let upstream: Response
  try {
    upstream = await fetch('https://api.getdocuforge.dev/v1/pdf', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${docuforgeKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html,
        filename: `propuesta-${input.proposalId}.pdf`,
      }),
    })
  } catch (err) {
    console.error('[export/pdf] DocuForge unreachable:', err)
    return jsonResponse({ error: 'PDF service unavailable.' }, 503)
  }

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => 'Unknown error')
    console.error(`[export/pdf] DocuForge error ${upstream.status}:`, errorText)
    return jsonResponse({ error: 'PDF generation failed.' }, 502)
  }

  // DocuForge can return either the PDF bytes directly or a JSON { url: string }
  const contentType = upstream.headers.get('Content-Type') ?? ''

  if (contentType.includes('application/pdf')) {
    const bytes = await upstream.arrayBuffer()
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="propuesta-${input.proposalId}.pdf"`,
      },
    })
  }

  // JSON response with a URL
  const json = (await upstream.json()) as { url?: string }
  if (!json.url) {
    return jsonResponse({ error: 'PDF generation failed: no URL returned.' }, 502)
  }
  return jsonResponse({ url: json.url }, 200)
}

async function handleDOCX(
  input: ExportRequest,
  orgId: string,
): Promise<Response> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:8000'

  let upstream: Response
  try {
    upstream = await fetch(
      `${apiUrl}/proposals/${input.proposalId}/export/docx`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': orgId,
        },
        body: JSON.stringify({ sections: input.sections }),
      },
    )
  } catch (err) {
    console.error('[export/docx] FastAPI unreachable:', err)
    return jsonResponse({ error: 'DOCX export service unavailable.' }, 503)
  }

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => 'Unknown error')
    console.error(`[export/docx] FastAPI error ${upstream.status}:`, errorText)
    return jsonResponse({ error: 'DOCX generation failed.' }, 502)
  }

  const upstreamContentType =
    upstream.headers.get('Content-Type') ??
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

  const contentDisposition =
    upstream.headers.get('Content-Disposition') ??
    `attachment; filename="propuesta-${input.proposalId}.docx"`

  const bytes = await upstream.arrayBuffer()
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': upstreamContentType,
      'Content-Disposition': contentDisposition,
    },
  })
}

async function handleEmail(
  input: ExportRequest,
  orgId: string,
): Promise<Response> {
  if (!input.recipientEmail) {
    return jsonResponse(
      { error: '`recipientEmail` is required for email exports.' },
      400,
    )
  }

  const apiUrl = process.env.API_URL ?? 'http://localhost:8000'

  let upstream: Response
  try {
    upstream = await fetch(
      `${apiUrl}/proposals/${input.proposalId}/export/email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': orgId,
        },
        body: JSON.stringify({
          recipientEmail: input.recipientEmail,
          sections: input.sections,
        }),
      },
    )
  } catch (err) {
    console.error('[export/email] FastAPI unreachable:', err)
    return jsonResponse({ error: 'Email service unavailable.' }, 503)
  }

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => 'Unknown error')
    console.error(`[export/email] FastAPI error ${upstream.status}:`, errorText)
    return jsonResponse({ error: 'Email delivery failed.' }, 502)
  }

  return jsonResponse({ success: true, recipient: input.recipientEmail }, 200)
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  // Auth guard — require both user and org (tenant)
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  // Parse body
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  // Validate
  const parsed = ExportRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return jsonResponse(
      { error: 'Invalid request', details: parsed.error.issues },
      400,
    )
  }

  const input = parsed.data

  switch (input.format) {
    case 'pdf':
      return handlePDF(input, orgId)
    case 'docx':
      return handleDOCX(input, orgId)
    case 'email':
      return handleEmail(input, orgId)
  }
}

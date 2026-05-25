import chromium from '@sparticuz/chromium'
import nodemailer from 'nodemailer'
import puppeteer from 'puppeteer-core'
import { z } from 'zod/v4'
import { sanitizeHTML } from '@/lib/sanitize'
import { createAdminClient } from '@/lib/supabase/admin'

// Puppeteer, Chromium, and Nodemailer require Node.js APIs — must be nodejs runtime.
export const runtime = 'nodejs'
export const maxDuration = 60

// ─── Validation schema ────────────────────────────────────────────────────────

const ExportRequestSchema = z.object({
  // Allow empty string: Step3 sets proposalId='' when DB save failed but user
  // still wants to export from the in-memory sections.
  proposalId: z.string(),
  format: z.enum(['pdf', 'docx', 'email']),
  sections: z.record(z.string(), z.string()),
  recipientEmail: z.string().email().optional(),
})

type ExportRequest = z.infer<typeof ExportRequestSchema>

// ─── Section order & labels ───────────────────────────────────────────────────

const SECTION_META: { key: string; label: string }[] = [
  { key: 'portada', label: 'Portada' },
  { key: 'contextoCliente', label: 'Contexto del Cliente' },
  { key: 'diagnostico', label: 'Diagnóstico' },
  { key: 'oportunidad', label: 'Oportunidad Detectada' },
  { key: 'solucion', label: 'Solución Propuesta' },
  { key: 'alcance', label: 'Alcance Detallado' },
  { key: 'incluyeNoIncluye', label: 'Qué Incluye / No Incluye' },
  { key: 'metodologia', label: 'Metodología' },
  { key: 'cronograma', label: 'Cronograma' },
  { key: 'casosExito', label: 'Casos de Éxito' },
  { key: 'diferenciadores', label: 'Diferenciadores' },
  { key: 'inversion', label: 'Inversión' },
  { key: 'proximosPasos', label: 'Próximos Pasos' },
  { key: 'ctaFinal', label: 'Llamado a la Acción' },
]

// ─── Branding ─────────────────────────────────────────────────────────────────
//
// Loaded per-export from `tenants.metadata` so each agency's PDF carries its
// own logo and brand color. Falls back to neutral defaults so the export still
// works for tenants that haven't completed the /company onboarding.

interface BrandConfig {
  companyName: string
  primaryColor: string
  logoUrl: string | null
}

const DEFAULT_BRAND: BrandConfig = {
  companyName: 'Smart Proposal Generator',
  primaryColor: '#1D9E75',
  logoUrl: null,
}

/** Validate a CSS color so we don't inject arbitrary strings into the stylesheet. */
function safeColor(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed
  return null
}

/** Validate that a logo URL is http(s) and not a private/internal address. */
function safeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!/^https?:\/\//i.test(trimmed)) return null
  try {
    const { hostname } = new URL(trimmed)
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return null
    if (/^169\.254\./.test(hostname)) return null
    if (/^10\./.test(hostname)) return null
    if (/^192\.168\./.test(hostname)) return null
    if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) return null
    if (hostname === 'metadata.google.internal') return null
  } catch {
    return null
  }
  return trimmed
}

async function loadBranding(tenantId: string): Promise<BrandConfig> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('tenants')
      .select('name, metadata')
      .eq('id', tenantId)
      .maybeSingle()

    if (error || !data) return DEFAULT_BRAND
    const meta = (data.metadata as Record<string, unknown> | null) ?? {}

    return {
      companyName: (typeof data.name === 'string' && data.name) || DEFAULT_BRAND.companyName,
      primaryColor: safeColor(meta.primary_color) ?? DEFAULT_BRAND.primaryColor,
      logoUrl: safeUrl(meta.logo_url),
    }
  } catch (err) {
    console.error('[export/branding] Failed to load branding:', err)
    return DEFAULT_BRAND
  }
}

/** Minimal HTML-escape for branding strings that land inside text nodes. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildProposalHTML(sections: Record<string, string>, brand: BrandConfig): string {
  const sectionBlocks = SECTION_META
    .filter(({ key }) => sections[key])
    .map(
      ({ key, label }) => `
    <section class="proposal-section">
      <h2>${label}</h2>
      <div class="section-body">${sanitizeHTML(sections[key])}</div>
    </section>`,
    )
    .join('\n')

  const color = brand.primaryColor
  const safeCompany = escapeHtml(brand.companyName)
  const safeLogo = brand.logoUrl ? escapeHtml(brand.logoUrl) : null

  const logoBlock = safeLogo
    ? `<img src="${safeLogo}" alt="${safeCompany} logo" class="brand-logo" />`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Propuesta Comercial — ${safeCompany}</title>
  <style>
    /* Force colors + images in PDF generators that respect this hint. */
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page { size: A4; margin: 0; }

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
      border-bottom: 3px solid ${color};
      padding-bottom: 24px;
      margin-bottom: 40px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .brand-logo {
      max-height: 56px;
      max-width: 200px;
      object-fit: contain;
    }

    .proposal-header .titles {
      flex: 1;
      min-width: 0;
    }

    .proposal-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: ${color};
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
      color: ${color};
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-left: 4px solid ${color};
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

    /* Tables — LLM emits these for "inversion" section */
    .section-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 13px;
    }
    .section-body table th,
    .section-body table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
    }
    .section-body table th {
      background: #f9fafb;
      font-weight: 600;
      color: #111827;
      border-bottom: 2px solid ${color};
    }
    .section-body table tr:last-child td {
      border-bottom: none;
      font-weight: 700;
      color: ${color};
    }

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
      ${logoBlock}
      <div class="titles">
        <h1>Propuesta Comercial</h1>
        <p class="subtitle">Preparada por ${safeCompany}</p>
      </div>
    </header>

    <main>
      ${sectionBlocks}
    </main>

    <footer class="proposal-footer">
      <p>Este documento es confidencial y fue generado exclusivamente para el destinatario indicado.</p>
      <p>${safeCompany} &mdash; &copy; ${new Date().getFullYear()}</p>
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
  orgId: string,
): Promise<Response> {
  const brand = await loadBranding(orgId)
  const html = buildProposalHTML(input.sections, brand)

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()
    // 'networkidle0' is excluded from setContent's waitUntil in puppeteer-core v25;
    // 'load' is sufficient since buildProposalHTML produces fully-inlined HTML.
    await page.setContent(html, { waitUntil: 'load' })

    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    })

    // page.pdf() returns Uint8Array in puppeteer-core v25; convert to ArrayBuffer
    // so the Response constructor (BodyInit) accepts it.
    return new Response(Buffer.from(pdfUint8), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="propuesta-${input.proposalId}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[export/pdf] Chromium PDF generation failed:', err)
    return jsonResponse({ error: 'PDF generation failed.' }, 500)
  } finally {
    await browser?.close()
  }
}

async function handleDOCX(
  input: ExportRequest,
  orgId: string,
): Promise<Response> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:8000'
  // Use a placeholder segment when proposalId is empty (save failed) so the
  // FastAPI path is valid; the backend will treat unknown IDs as 404 gracefully.
  const proposalSegment = input.proposalId || 'unsaved'

  let upstream: Response
  try {
    upstream = await fetch(
      `${apiUrl}/proposals/${proposalSegment}/export/docx`,
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

  const rawDisposition =
    upstream.headers.get('Content-Disposition') ??
    `attachment; filename="propuesta-${input.proposalId}.docx"`
  const contentDisposition = rawDisposition.replace(/[\r\n]/g, '')

  const bytes = await upstream.arrayBuffer()
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': contentDisposition,
    },
  })
}

// ─── Email: placeholder detection ────────────────────────────────────────────
//
// A RESEND_API_KEY is considered a placeholder when:
//   • it's absent / undefined
//   • it ends with "..." (e.g. "re_...")
//   • there are 5 or fewer characters after the "re_" prefix
//
// In that case we fall back to Ethereal Email (Nodemailer test accounts),
// which require zero registration and work without any API key.

function isResendPlaceholder(key: string | undefined): boolean {
  if (!key) return true
  if (key.endsWith('...')) return true
  // Strip the "re_" prefix and check remaining length
  const suffix = key.startsWith('re_') ? key.slice(3) : key
  return suffix.length <= 5
}

async function sendViaEthereal(
  recipientEmail: string,
  subject: string,
  htmlContent: string,
): Promise<{ previewUrl: string }> {
  const testAccount = await nodemailer.createTestAccount()
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  })

  const info = await transporter.sendMail({
    from: '"Smart Proposal" <demo@smartproposal.app>',
    to: recipientEmail,
    subject,
    html: htmlContent,
  })

  const previewUrl = nodemailer.getTestMessageUrl(info) || ''
  console.log('[export/email] Ethereal preview URL:', previewUrl)
  return { previewUrl }
}

async function sendViaResend(
  resendKey: string,
  recipientEmail: string,
  subject: string,
  htmlContent: string,
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Smart Proposal <demo@smartproposal.app>',
      to: [recipientEmail],
      subject,
      html: htmlContent,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error')
    console.error(`[export/email] Resend error ${res.status}:`, errorText)
    throw new Error(`Resend delivery failed: ${res.status}`)
  }
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

  const brand = await loadBranding(orgId)
  const htmlContent = buildProposalHTML(input.sections, brand)
  const subject = `Propuesta Comercial — ${brand.companyName}`
  const resendKey = process.env.RESEND_API_KEY

  if (isResendPlaceholder(resendKey)) {
    if (process.env.NODE_ENV === 'production') {
      return jsonResponse({ error: 'Email service not configured' }, 503)
    }
    // ── Fallback: Ethereal (test SMTP, no signup needed) ──
    try {
      const { previewUrl } = await sendViaEthereal(
        input.recipientEmail,
        subject,
        htmlContent,
      )
      return jsonResponse({
        success: true,
        recipient: input.recipientEmail,
        previewUrl,
        mode: 'ethereal',
      }, 200)
    } catch (err) {
      console.error('[export/email] Ethereal send failed:', err)
      return jsonResponse({ error: 'Email delivery failed (test mode).' }, 502)
    }
  }

  // ── Production path: Resend ──
  try {
    await sendViaResend(resendKey!, input.recipientEmail, subject, htmlContent)
    return jsonResponse({ success: true, recipient: input.recipientEmail }, 200)
  } catch (err) {
    console.error('[export/email] Resend send failed:', err)
    return jsonResponse({ error: 'Email delivery failed.' }, 502)
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  // Auth guard
  let tenantId: string
  try {
    const { requireAuth } = await import('@/lib/auth')
    const session = await requireAuth()
    tenantId = session.tenantId
  } catch {
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

  // Verify proposalId belongs to this tenant (skip if empty — happens when DB save failed
  // in Step3 but user still wants to export from in-memory sections).
  if (input.proposalId) {
    const { createAdminClient: adminCheck } = await import('@/lib/supabase/admin')
    const adminDb = adminCheck()
    const { data: proposalCheck } = await adminDb
      .from('proposals')
      .select('id')
      .eq('id', input.proposalId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!proposalCheck) {
      return jsonResponse({ error: 'Proposal not found' }, 404)
    }
  }

  switch (input.format) {
    case 'pdf':
      return handlePDF(input, tenantId)
    case 'docx':
      return handleDOCX(input, tenantId)
    case 'email':
      return handleEmail(input, tenantId)
  }
}

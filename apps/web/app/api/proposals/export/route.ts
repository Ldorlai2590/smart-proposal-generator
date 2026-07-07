import nodemailer from 'nodemailer'
import { z } from 'zod/v4'
import { sanitizeHTML } from '@/lib/sanitize'
import { createAdminClient } from '@/lib/supabase/admin'
import { FONTS } from '@/lib/fonts'

// Only names present in the curated catalog are allowed into the export HTML/URL,
// so a poisoned tenants.metadata value can't inject CSS or a rogue <link> URL.
const FONT_BY_NAME = new Map(FONTS.map((f) => [f.name, f]))

interface ResolvedFont {
  name: string
  google: boolean
}

function safeFont(raw: unknown): ResolvedFont | null {
  if (typeof raw !== 'string') return null
  const f = FONT_BY_NAME.get(raw.trim())
  if (!f) return null
  return { name: f.name, google: f.source === 'google' }
}

// Puppeteer, Chromium, and Nodemailer require Node.js APIs — must be nodejs runtime.
export const runtime = 'nodejs'
export const maxDuration = 60

// ─── Validation schema ────────────────────────────────────────────────────────

const ExportRequestSchema = z.object({
  // Allow empty string: Step3 sets proposalId='' when DB save failed but user
  // still wants to export from the in-memory sections.
  proposalId: z.string(),
  format: z.enum(['pdf', 'docx', 'email']),
  // Bound section count and size so a user can't OOM Chromium with hundreds of
  // MB of HTML. Each value ≤ 50k chars; at most 25 sections.
  sections: z
    .record(z.string().max(100), z.string().max(50_000))
    .refine((r) => Object.keys(r).length <= 25, { message: 'too many sections' }),
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
  fontHeading: ResolvedFont | null
  fontBody: ResolvedFont | null
}

const DEFAULT_BRAND: BrandConfig = {
  companyName: 'Smart Proposal Generator',
  primaryColor: '#1D9E75',
  logoUrl: null,
  fontHeading: null,
  fontBody: null,
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
      fontHeading: safeFont(meta.font_heading),
      fontBody: safeFont(meta.font_body),
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

  // ── Typography ──
  // Font names are catalog-validated (safeFont), so they're safe to inline into
  // CSS and a Google Fonts URL. Chromium fetches the <link> when rendering the PDF,
  // so the tenant's chosen font actually appears in the output (not just the picker).
  const FALLBACK = `'Helvetica Neue', Helvetica, Arial, sans-serif`
  const headingStack = brand.fontHeading ? `'${brand.fontHeading.name}', ${FALLBACK}` : FALLBACK
  const bodyStack = brand.fontBody ? `'${brand.fontBody.name}', ${FALLBACK}` : FALLBACK
  const googleFamilies = [...new Set(
    [brand.fontHeading, brand.fontBody]
      .filter((f): f is ResolvedFont => !!f && f.google)
      .map((f) => f.name),
  )]
  const fontLink = googleFamilies.length
    ? `<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${googleFamilies
        .map((n) => `family=${encodeURIComponent(n).replace(/%20/g, '+')}:wght@400;500;600;700`)
        .join('&')}&display=swap" />`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Propuesta Comercial — ${safeCompany}</title>
  ${fontLink}
  <style>
    /* Force colors + images in PDF generators that respect this hint. */
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page { size: A4; margin: 0; }

    body {
      font-family: ${bodyStack};
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
      font-family: ${headingStack};
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
      font-family: ${headingStack};
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

function htmlFallbackResponse(html: string, slug: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="propuesta-${slug}.html"`,
      'X-Export-Fallback': 'html',
    },
  })
}

async function handlePDF(
  input: ExportRequest,
  orgId: string,
): Promise<Response> {
  const brand = await loadBranding(orgId)
  const html = buildProposalHTML(input.sections, brand)
  const slug = input.proposalId || 'draft'

  try {
    const { generatePDFFromHTML } = await import('@/lib/pdf-docuforge')
    const pdfBytes = await generatePDFFromHTML(html)

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="propuesta-${slug}.pdf"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[export/pdf] Chromium PDF failed, falling back to HTML:', msg)
    return htmlFallbackResponse(html, slug)
  }
}

async function handleDOCX(
  input: ExportRequest,
  orgId: string,
): Promise<Response> {
  const brand = await loadBranding(orgId)
  try {
    const { generateDOCXFromSections } = await import('@/lib/docx-generator')
    const docxBytes = await generateDOCXFromSections(
      input.sections,
      brand.companyName,
      brand.primaryColor,
      { heading: brand.fontHeading?.name, body: brand.fontBody?.name },
    )
    return new Response(Buffer.from(docxBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="propuesta-${input.proposalId || 'draft'}.docx"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[export/docx] Generation failed:', msg)
    return jsonResponse({ error: 'DOCX generation failed. Please try again.' }, 500)
  }
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

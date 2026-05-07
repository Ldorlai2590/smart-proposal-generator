/**
 * POST /api/emails/send
 *
 * Accepts { template, to, data }, renders the matching React Email template,
 * and dispatches via Resend. Requires an authenticated session.
 */

import { render } from '@react-email/components'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import ProposalReadyEmail, {
  type ProposalReadyEmailProps,
} from '@/emails/proposal-ready'
import ProposalSharedEmail, {
  type ProposalSharedEmailProps,
} from '@/emails/proposal-shared'
import TrialExpiringEmail, {
  type TrialExpiringEmailProps,
} from '@/emails/trial-expiring'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EmailTemplate = 'proposal-ready' | 'proposal-shared' | 'trial-expiring'

interface SendEmailRequest {
  template: EmailTemplate
  to: string
  data: Record<string, unknown>
}

// Resend /emails response
interface ResendResponse {
  id?: string
  error?: { message: string }
}

// ---------------------------------------------------------------------------
// Subjects per template
// ---------------------------------------------------------------------------

const SUBJECTS: Record<EmailTemplate, (data: Record<string, unknown>) => string> = {
  'proposal-ready': (d) =>
    `Tu propuesta está lista: ${(d.proposalTitle as string | undefined) ?? 'Propuesta Comercial'}`,
  'proposal-shared': (d) =>
    `${(d.senderCompany as string | undefined) ?? 'Una empresa'} te ha enviado una propuesta`,
  'trial-expiring': (d) => {
    const days = d.daysRemaining as number | undefined
    if (days === 1) return 'Tu trial expira mañana — actualiza tu plan'
    return `Tu trial expira en ${days ?? 3} días — actualiza tu plan`
  },
}

// ---------------------------------------------------------------------------
// Template renderer
// ---------------------------------------------------------------------------

async function renderTemplate(
  template: EmailTemplate,
  data: Record<string, unknown>,
): Promise<string> {
  switch (template) {
    case 'proposal-ready':
      return render(ProposalReadyEmail(data as ProposalReadyEmailProps))
    case 'proposal-shared':
      return render(ProposalSharedEmail(data as ProposalSharedEmailProps))
    case 'trial-expiring':
      return render(TrialExpiringEmail(data as TrialExpiringEmailProps))
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Validate env ──────────────────────────────────────────────────────────
  const resendApiKey = process.env.RESEND_API_KEY
  const emailFrom =
    process.env.EMAIL_FROM ?? 'Smart Proposal Generator <noreply@smartproposal.com>'

  if (!resendApiKey) {
    console.error('[emails/send] RESEND_API_KEY is not set')
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: SendEmailRequest
  try {
    body = (await req.json()) as SendEmailRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { template, to, data } = body

  const allowedTemplates: EmailTemplate[] = [
    'proposal-ready',
    'proposal-shared',
    'trial-expiring',
  ]

  if (!template || !allowedTemplates.includes(template)) {
    return NextResponse.json(
      { error: `Invalid template. Allowed: ${allowedTemplates.join(', ')}` },
      { status: 400 },
    )
  }

  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return NextResponse.json({ error: 'Invalid recipient email address' }, { status: 400 })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  let html: string
  try {
    html = await renderTemplate(template, data ?? {})
  } catch (err) {
    console.error('[emails/send] Template render error:', err)
    return NextResponse.json({ error: 'Failed to render email template' }, { status: 500 })
  }

  const subject = SUBJECTS[template](data ?? {})

  // ── Send via Resend ───────────────────────────────────────────────────────
  let resendRes: Response
  try {
    resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [to],
        subject,
        html,
      }),
    })
  } catch (err) {
    console.error('[emails/send] Resend network error:', err)
    return NextResponse.json({ error: 'Email delivery failed (network)' }, { status: 502 })
  }

  if (!resendRes.ok) {
    const payload = (await resendRes.json().catch(() => ({}))) as ResendResponse
    console.error('[emails/send] Resend API error:', payload)
    return NextResponse.json(
      { error: payload.error?.message ?? 'Email delivery failed' },
      { status: resendRes.status },
    )
  }

  const result = (await resendRes.json()) as ResendResponse
  console.log(`[emails/send] Sent template="${template}" to="${to}" id=${result.id}`)

  return NextResponse.json({ success: true, id: result.id })
}

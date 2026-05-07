/**
 * Email sender utility — calls /api/emails/send which renders React Email
 * templates and dispatches via Resend.
 *
 * All functions are fire-and-forget safe; they throw on network/API errors
 * so callers can decide whether to surface the error.
 */

export interface SendProposalReadyParams {
  to: string
  proposalTitle: string
  clientName: string
  proposalUrl: string
  senderName?: string
}

export interface SendProposalSharedParams {
  to: string
  proposalTitle: string
  senderCompany: string
  senderName: string
  recipientName?: string
  summary?: string
  proposalUrl: string
}

export interface SendTrialExpiringParams {
  to: string
  userName?: string
  daysRemaining: number
  upgradeUrl?: string
  proposalsUsed?: number
  proposalsQuota?: number
}

type EmailTemplate = 'proposal-ready' | 'proposal-shared' | 'trial-expiring'

interface SendEmailPayload {
  template: EmailTemplate
  to: string
  data: Record<string, unknown>
}

async function sendEmail(payload: SendEmailPayload): Promise<void> {
  const res = await fetch('/api/emails/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Email send failed [${res.status}]: ${text}`)
  }
}

/**
 * Sent when an AI-generated proposal is ready for review.
 */
export async function sendProposalReady(params: SendProposalReadyParams): Promise<void> {
  await sendEmail({
    template: 'proposal-ready',
    to: params.to,
    data: {
      proposalTitle: params.proposalTitle,
      clientName: params.clientName,
      proposalUrl: params.proposalUrl,
      senderName: params.senderName,
    },
  })
}

/**
 * Sent to the client when a proposal is shared via the public link.
 */
export async function sendProposalShared(params: SendProposalSharedParams): Promise<void> {
  await sendEmail({
    template: 'proposal-shared',
    to: params.to,
    data: {
      proposalTitle: params.proposalTitle,
      senderCompany: params.senderCompany,
      senderName: params.senderName,
      recipientName: params.recipientName,
      summary: params.summary,
      proposalUrl: params.proposalUrl,
    },
  })
}

/**
 * Sent 3 days before a tenant's trial expires.
 */
export async function sendTrialExpiring(params: SendTrialExpiringParams): Promise<void> {
  await sendEmail({
    template: 'trial-expiring',
    to: params.to,
    data: {
      userName: params.userName,
      daysRemaining: params.daysRemaining,
      upgradeUrl: params.upgradeUrl ?? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/billing`,
      proposalsUsed: params.proposalsUsed,
      proposalsQuota: params.proposalsQuota,
    },
  })
}

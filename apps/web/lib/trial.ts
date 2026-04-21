import { db } from './db'
import { tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Trial híbrido 30 + 30 días
// ---------------------------------------------------------------------------
//
// Stages:
//  no_card    → primeros 30 días, sin tarjeta. Acceso a features core.
//  with_card  → 30 días extra tras añadir tarjeta. Sin cobro.
//  active     → suscripción pagada activa (post-trial).
//  expired    → trial vencido y sin tarjeta → bloqueo.
//
// Transiciones:
//   no_card  → with_card  : usuario añade tarjeta (checkout session)
//   no_card  → expired    : trialEndsAt < now y no hay tarjeta
//   with_card → active    : primer invoice.paid de Stripe
//   with_card → expired   : trialEndsAt < now y subscription cancelada
// ---------------------------------------------------------------------------

export type TrialStage = 'no_card' | 'with_card' | 'active' | 'expired'

export interface TrialStatus {
  stage: TrialStage
  daysLeft: number
  trialEndsAt: Date
  cardOnFile: boolean
  plan: string
  proposalsUsed: number
  proposalsQuota: number
  canGenerateProposals: boolean
  shouldShowBanner: boolean
  shouldPromptCard: boolean
  isBlocked: boolean
}

/**
 * Devuelve el estado actual del trial de un tenant por su ID interno.
 * Hace "lazy expiration": si trialEndsAt ya pasó, marca stage='expired' en memoria
 * (el webhook de Stripe es quien lo persiste cuando corresponde).
 */
export async function getTrialStatus(tenantId: string): Promise<TrialStatus | null> {
  const rows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)

  if (rows.length === 0) return null
  const t = rows[0]

  const now = Date.now()
  const endMs = t.trialEndsAt.getTime()
  const msLeft = endMs - now
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)))

  let stage = t.trialStage as TrialStage

  // Lazy expiration — el stage efectivo cambia si el plazo venció
  if (stage !== 'active' && msLeft <= 0) {
    stage = 'expired'
  }

  const isBlocked =
    stage === 'expired' ||
    (stage !== 'active' && t.proposalsUsed >= t.proposalsQuota)

  return {
    stage,
    daysLeft,
    trialEndsAt: t.trialEndsAt,
    cardOnFile: t.cardOnFile,
    plan: t.plan,
    proposalsUsed: t.proposalsUsed,
    proposalsQuota: t.proposalsQuota,
    canGenerateProposals: !isBlocked,
    shouldShowBanner: stage !== 'active',
    shouldPromptCard: stage === 'no_card' && daysLeft <= 10,
    isBlocked,
  }
}

/**
 * Transición no_card → with_card. Llamada tras crear SetupIntent / añadir tarjeta.
 * Extiende el trial 30 días adicionales desde ahora.
 */
export async function extendTrialWithCard(
  tenantId: string,
  stripeCustomerId: string
): Promise<void> {
  const newEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await db
    .update(tenants)
    .set({
      trialStage: 'with_card',
      cardOnFile: true,
      stripeCustomerId,
      trialEndsAt: newEnd,
    })
    .where(eq(tenants.id, tenantId))
}

/**
 * Transición → active. Llamada desde el webhook de Stripe invoice.paid.
 */
export async function markSubscriptionActive(
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  plan: 'pro' | 'enterprise'
): Promise<void> {
  await db
    .update(tenants)
    .set({
      trialStage: 'active',
      plan,
      stripeSubscriptionId,
      proposalsUsed: 0,
      proposalsQuota: plan === 'pro' ? 200 : 999999,
    })
    .where(eq(tenants.stripeCustomerId, stripeCustomerId))
}

/**
 * Incrementa el contador de propuestas usadas. Llamar tras completar streaming.
 */
export async function incrementProposalUsage(tenantId: string): Promise<void> {
  const rows = await db
    .select({ used: tenants.proposalsUsed })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)

  if (rows.length === 0) return

  await db
    .update(tenants)
    .set({ proposalsUsed: rows[0].used + 1 })
    .where(eq(tenants.id, tenantId))
}

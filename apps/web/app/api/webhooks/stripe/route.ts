import type Stripe from 'stripe'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { markSubscriptionActive } from '@/lib/trial'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mask Stripe ids (cus_*, sub_*, in_*) so logs don't carry the full token.
 * Keeps the type prefix + last 4 for traceability.
 */
function maskId(id: string | null | undefined): string | null {
  if (!id) return null
  if (id.length <= 8) return '***'
  return `${id.slice(0, 4)}***${id.slice(-4)}`
}

/**
 * Derive plan from the first line item's price lookup_key.
 * Supported conventions:
 *   pro_*         → 'pro'
 *   enterprise_*  → 'enterprise'
 * Anything else returns null (caller must reject the event with 400).
 */
function planFromLookupKey(
  lookupKey: string | null | undefined
): 'pro' | 'enterprise' | null {
  if (!lookupKey) return null
  if (lookupKey === 'pro' || lookupKey.startsWith('pro_')) return 'pro'
  if (lookupKey === 'enterprise' || lookupKey.startsWith('enterprise_'))
    return 'enterprise'
  return null
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/stripe
//
// Maneja los eventos que mueven el trial híbrido 30 + 30:
//
//   setup_intent.succeeded          → usuario añadió tarjeta → stage=with_card
//   customer.subscription.updated   → cambia plan o estado
//   invoice.paid                    → primer cobro exitoso → stage=active
//   customer.subscription.deleted   → cancelación → stage=expired
// ---------------------------------------------------------------------------

let stripeClient: Stripe | null = null
async function getStripe(): Promise<Stripe> {
  if (stripeClient) return stripeClient
  const { default: Stripe } = await import('stripe')
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')
  return stripeClient
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || secret === 'whsec_...') {
    // Demo mode — no real Stripe webhook will reach this endpoint
    return new Response('OK', { status: 200 })
  }

  const headerPayload = await headers()
  const sig = headerPayload.get('stripe-signature')
  if (!sig) return new Response('Missing stripe-signature header', { status: 400 })

  const body = await req.text()

  let event: Stripe.Event
  try {
    const stripe = await getStripe()
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    logger.error('stripe.webhook.bad_signature', { err: String(err) })
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    switch (event.type) {
      // -------------------------------------------------------------------
      // Usuario añadió tarjeta — extender trial 30 días
      // -------------------------------------------------------------------
      case 'setup_intent.succeeded': {
        const intent = event.data.object as Stripe.SetupIntent
        const customerId =
          typeof intent.customer === 'string' ? intent.customer : intent.customer?.id
        if (!customerId) break

        const newEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        await db
          .update(tenants)
          .set({
            trialStage: 'with_card',
            cardOnFile: true,
            trialEndsAt: newEnd,
          })
          .where(eq(tenants.stripeCustomerId, customerId))

        logger.info('stripe.trial_extended', {
          customerId: maskId(customerId),
          trialEndsAt: newEnd.toISOString(),
        })
        break
      }

      // -------------------------------------------------------------------
      // Primer cobro exitoso — activar suscripción
      // -------------------------------------------------------------------
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        // Narrow: invoice objects carry subscription via lines / metadata depending on API version.
        // Safe path: read from invoice.parent?.subscription_details in recent API versions.
        const subscriptionId =
          (invoice as unknown as { subscription?: string }).subscription ?? null
        if (!customerId || !subscriptionId) break

        // Derivar `plan` desde lookup_key del primer line item.
        // Stripe incluye lines.data en payloads de invoice.paid por defecto,
        // pero `price` puede ser null en invoice items sin price asociado.
        const firstLine = invoice.lines?.data?.[0]
        const lookupKey = firstLine?.price?.lookup_key ?? null
        const plan = planFromLookupKey(lookupKey)

        if (!plan) {
          logger.error('stripe.unknown_lookup_key', {
            customerId: maskId(customerId),
            subscriptionId: maskId(subscriptionId),
            lookupKey,
            invoiceId: maskId(invoice.id),
          })
          return new Response(
            JSON.stringify({ error: 'Unknown plan lookup_key', lookup_key: lookupKey }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }

        await markSubscriptionActive(customerId, subscriptionId, plan)
        logger.info('stripe.subscription_active', {
          customerId: maskId(customerId),
          subscriptionId: maskId(subscriptionId),
          plan,
        })
        break
      }

      // -------------------------------------------------------------------
      // Cancelación de suscripción — marcar expired
      // -------------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id

        await db
          .update(tenants)
          .set({
            trialStage: 'expired',
            plan: 'free',
            stripeSubscriptionId: null,
          })
          .where(eq(tenants.stripeCustomerId, customerId))

        logger.info('stripe.subscription_canceled', {
          customerId: maskId(customerId),
        })
        break
      }

      default:
        // Ignorar eventos no manejados (retornar 200 evita reintentos)
        logger.info('stripe.event_ignored', { type: event.type })
        break
    }
  } catch (err) {
    logger.error('stripe.handler_error', { err: String(err) })
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}

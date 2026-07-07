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
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: STRIPE_WEBHOOK_SECRET not configured in production')
      return new Response('Webhook secret not configured', { status: 500 })
    }
    return new Response('OK (demo mode)', { status: 200 })
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
        const firstLine = invoice.lines?.data?.[0]

        // The top-level invoice.subscription field was removed in recent Stripe API
        // versions; the subscription id now lives under invoice.parent.subscription_details
        // (or the line item's parent). Try all locations so this works across versions.
        const inv = invoice as unknown as {
          subscription?: string | { id: string } | null
          parent?: { subscription_details?: { subscription?: string | { id: string } | null } }
        }
        const lineParent = firstLine as unknown as {
          parent?: { subscription_item_details?: { subscription?: string | null } }
        }
        const rawSub =
          inv.subscription ??
          inv.parent?.subscription_details?.subscription ??
          lineParent?.parent?.subscription_item_details?.subscription ??
          null
        const subscriptionId = typeof rawSub === 'string' ? rawSub : rawSub?.id ?? null
        if (!customerId || !subscriptionId) break

        // Derivar `plan` desde lookup_key del primer line item.
        const lookupKey = firstLine?.price?.lookup_key ?? null
        const plan = planFromLookupKey(lookupKey)

        if (!plan) {
          logger.warn('stripe.unknown_lookup_key', {
            customerId: maskId(customerId),
            subscriptionId: maskId(subscriptionId),
            lookupKey,
            invoiceId: maskId(invoice.id),
          })
          return new Response('OK', { status: 200 })
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
      // Cambio de plan/estado de suscripción
      // -------------------------------------------------------------------
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const lookupKey = sub.items?.data?.[0]?.price?.lookup_key ?? null
        const plan = planFromLookupKey(lookupKey)

        if ((sub.status === 'active' || sub.status === 'trialing') && plan) {
          await markSubscriptionActive(customerId, sub.id, plan)
          logger.info('stripe.subscription_updated_active', {
            customerId: maskId(customerId),
            plan,
            status: sub.status,
          })
        } else if (['canceled', 'unpaid', 'past_due', 'incomplete_expired'].includes(sub.status)) {
          await db
            .update(tenants)
            .set({ trialStage: 'expired', plan: 'free' })
            .where(eq(tenants.stripeCustomerId, customerId))
          logger.info('stripe.subscription_updated_inactive', {
            customerId: maskId(customerId),
            status: sub.status,
          })
        } else {
          logger.info('stripe.subscription_updated_noop', {
            customerId: maskId(customerId),
            status: sub.status,
          })
        }
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

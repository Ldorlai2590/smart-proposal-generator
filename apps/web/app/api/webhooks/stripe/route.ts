import type Stripe from 'stripe'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { markSubscriptionActive } from '@/lib/trial'

// ---------------------------------------------------------------------------
// POST /api/webhooks/stripe
//
// Maneja los eventos que mueven el trial híbrido 30 + 30:
//
//   setup_intent.succeeded          → usuario añadió tarjeta → stage=with_card
//   checkout.session.completed      → completar checkout → activar suscripción
//   customer.subscription.updated   → cambia plan o estado en Stripe
//   customer.subscription.deleted   → cancelación → downgrade a free
//   invoice.paid / payment_succeeded → cobro exitoso → stage=active, reset flag
//   invoice.payment_failed          → cobro fallido → marcar at_risk
// ---------------------------------------------------------------------------

let stripeClient: Stripe | null = null
async function getStripe(): Promise<Stripe> {
  if (stripeClient) return stripeClient
  const { default: Stripe } = await import('stripe')
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')
  return stripeClient
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extracts a string customer ID from Stripe's expandable customer field. */
function extractCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | null {
  if (!customer) return null
  if (typeof customer === 'string') return customer
  return customer.id
}

/**
 * Derives the plan slug from a Stripe lookup_key on the first line item.
 * Falls back to 'pro' when lookup_key is absent.
 */
function derivePlan(
  lines?: Stripe.ApiList<Stripe.InvoiceLineItem>,
): 'pro' | 'enterprise' {
  const lookupKey = lines?.data?.[0]?.price?.lookup_key ?? ''
  if (lookupKey.includes('enterprise')) return 'enterprise'
  return 'pro'
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set')
    return new Response('Internal Server Error', { status: 500 })
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
    console.error('[stripe-webhook] Signature verification failed:', err)
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    switch (event.type) {
      // -------------------------------------------------------------------
      // Usuario añadió tarjeta — extender trial 30 días
      // -------------------------------------------------------------------
      case 'setup_intent.succeeded': {
        const intent = event.data.object as Stripe.SetupIntent
        const customerId = extractCustomerId(intent.customer)
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

        console.log(
          `[stripe-webhook] Trial extended for customer ${customerId} → ${newEnd.toISOString()}`
        )
        break
      }

      // -------------------------------------------------------------------
      // Checkout completado — activar suscripción inmediatamente
      // -------------------------------------------------------------------
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = extractCustomerId(session.customer)
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription?.id ?? null)

        if (!customerId || !subscriptionId) {
          // Could be a one-time payment — skip
          console.log(
            `[stripe-webhook] checkout.session.completed: no customer/subscription, skipping`
          )
          break
        }

        // Derive plan from metadata set at checkout creation time
        const planMeta = session.metadata?.plan
        const plan: 'pro' | 'enterprise' =
          planMeta === 'enterprise' ? 'enterprise' : 'pro'

        await markSubscriptionActive(customerId, subscriptionId, plan)
        console.log(
          `[stripe-webhook] checkout.session.completed: tenant activated plan=${plan} sub=${subscriptionId}`
        )
        break
      }

      // -------------------------------------------------------------------
      // Suscripción actualizada — sincronizar plan y estado
      // -------------------------------------------------------------------
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = extractCustomerId(sub.customer)
        if (!customerId) break

        const stripeStatus = sub.status // 'active' | 'past_due' | 'canceled' | …

        if (stripeStatus === 'active') {
          // Derive plan from price lookup_key on the first item
          const lookupKey = sub.items?.data?.[0]?.price?.lookup_key ?? ''
          const plan: 'pro' | 'enterprise' = lookupKey.includes('enterprise')
            ? 'enterprise'
            : 'pro'

          await db
            .update(tenants)
            .set({
              trialStage: 'active',
              plan,
              stripeSubscriptionId: sub.id,
              proposalsQuota: plan === 'pro' ? 200 : 999999,
            })
            .where(eq(tenants.stripeCustomerId, customerId))

          console.log(
            `[stripe-webhook] customer.subscription.updated: plan=${plan} status=active for ${customerId}`
          )
        } else if (stripeStatus === 'past_due') {
          // Don't downgrade immediately — just log; invoice.payment_failed handles the flag
          console.log(
            `[stripe-webhook] customer.subscription.updated: status=past_due for ${customerId}`
          )
        } else if (stripeStatus === 'canceled') {
          await db
            .update(tenants)
            .set({
              trialStage: 'expired',
              plan: 'free',
              stripeSubscriptionId: null,
            })
            .where(eq(tenants.stripeCustomerId, customerId))

          console.log(
            `[stripe-webhook] customer.subscription.updated: canceled for ${customerId}`
          )
        }
        break
      }

      // -------------------------------------------------------------------
      // Cancelación de suscripción — downgrade a free
      // -------------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = extractCustomerId(sub.customer)
        if (!customerId) break

        await db
          .update(tenants)
          .set({
            trialStage: 'expired',
            plan: 'free',
            stripeSubscriptionId: null,
          })
          .where(eq(tenants.stripeCustomerId, customerId))

        console.log(`[stripe-webhook] Subscription canceled for ${customerId}`)
        break
      }

      // -------------------------------------------------------------------
      // Cobro exitoso — activar/mantener suscripción, limpiar flag at_risk
      // -------------------------------------------------------------------
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = extractCustomerId(invoice.customer)
        const subscriptionId =
          (invoice as unknown as { subscription?: string }).subscription ?? null

        if (!customerId || !subscriptionId) break

        const plan = derivePlan(
          (invoice as unknown as { lines?: Stripe.ApiList<Stripe.InvoiceLineItem> }).lines
        )

        await markSubscriptionActive(customerId, subscriptionId, plan)

        // Clear any payment_failed flag stored in metadata
        const rows = await db
          .select({ metadata: tenants.metadata })
          .from(tenants)
          .where(eq(tenants.stripeCustomerId, customerId))
          .limit(1)

        if (rows.length > 0) {
          const meta = (rows[0].metadata as Record<string, unknown>) ?? {}
          if (meta.paymentFailed) {
            await db
              .update(tenants)
              .set({ metadata: { ...meta, paymentFailed: false } })
              .where(eq(tenants.stripeCustomerId, customerId))
          }
        }

        console.log(
          `[stripe-webhook] ${event.type}: subscription ${subscriptionId} active for ${customerId} (${plan})`
        )
        break
      }

      // -------------------------------------------------------------------
      // Cobro fallido — marcar at_risk en metadata, enviar alerta
      // -------------------------------------------------------------------
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = extractCustomerId(invoice.customer)
        if (!customerId) break

        // Persist at_risk flag in tenant metadata for UI banners
        const rows = await db
          .select({ metadata: tenants.metadata })
          .from(tenants)
          .where(eq(tenants.stripeCustomerId, customerId))
          .limit(1)

        if (rows.length > 0) {
          const meta = (rows[0].metadata as Record<string, unknown>) ?? {}
          await db
            .update(tenants)
            .set({
              metadata: {
                ...meta,
                paymentFailed: true,
                paymentFailedAt: new Date().toISOString(),
              },
            })
            .where(eq(tenants.stripeCustomerId, customerId))
        }

        console.warn(
          `[stripe-webhook] invoice.payment_failed for customer ${customerId} — invoice ${invoice.id}`
        )

        // Note: email notification via Resend should be triggered here by
        // reading the tenant's email from the DB and calling sendEmail().
        // Omitted to avoid a cross-module DB join in the webhook; consider
        // queueing a job instead (e.g. via Redis/BullMQ).
        break
      }

      default:
        // Ignorar eventos no manejados (retornar 200 evita reintentos de Stripe)
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
        break
    }
  } catch (err) {
    console.error('[stripe-webhook] Handler error:', err)
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}

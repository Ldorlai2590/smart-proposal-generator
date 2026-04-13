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

        console.log(
          `[stripe-webhook] Trial extended for customer ${customerId} → ${newEnd.toISOString()}`
        )
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

        // TODO: derivar `plan` a partir de invoice.lines[0].price.lookup_key
        const plan: 'pro' | 'enterprise' = 'pro'

        await markSubscriptionActive(customerId, subscriptionId, plan)
        console.log(
          `[stripe-webhook] Subscription ${subscriptionId} marked active for ${customerId} (${plan})`
        )
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

        console.log(`[stripe-webhook] Subscription canceled for ${customerId}`)
        break
      }

      default:
        // Ignorar eventos no manejados (retornar 200 evita reintentos)
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
        break
    }
  } catch (err) {
    console.error('[stripe-webhook] Handler error:', err)
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}

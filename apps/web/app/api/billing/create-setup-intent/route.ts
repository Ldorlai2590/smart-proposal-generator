import { db } from '@/lib/db'
import { tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

let stripeClient: import('stripe').default | null = null
async function getStripe() {
  if (stripeClient) return stripeClient
  const { default: Stripe } = await import('stripe')
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')
  return stripeClient
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST() {
  let tenantId: string
  try {
    const session = await requireAuth()
    tenantId = session.tenantId
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY ?? ''
  if (!stripeKey || stripeKey.startsWith('sk_test_...') || stripeKey === 'sk_test_') {
    return jsonResponse({ error: 'Función de pago disponible en producción.' }, 503)
  }

  const stripe = await getStripe()

  const rows = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  if (rows.length === 0) return jsonResponse({ error: 'Tenant not found' }, 404)

  const tenant = rows[0]
  let customerId = tenant.stripeCustomerId

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: tenant.name,
      metadata: { tenant_id: tenant.id },
    })
    customerId = customer.id
    await db.update(tenants).set({ stripeCustomerId: customerId }).where(eq(tenants.id, tenantId))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    customer: customerId,
    payment_method_types: ['card'],
    success_url: `${appUrl}/billing?setup=success`,
    cancel_url: `${appUrl}/billing?setup=cancel`,
    metadata: { tenant_id: tenantId, purpose: 'trial_extension' },
  })

  return new Response(null, { status: 303, headers: { Location: session.url! } })
}

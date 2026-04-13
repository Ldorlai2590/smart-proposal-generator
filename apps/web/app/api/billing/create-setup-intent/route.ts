import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// POST /api/billing/create-setup-intent
//
// Flujo:
//   1. Busca el tenant por orgId.
//   2. Si no tiene stripeCustomerId → crea uno en Stripe.
//   3. Crea un SetupIntent (sin cobro, solo captura tarjeta).
//   4. Redirige a la página de Stripe Checkout (mode=setup) donde el
//      usuario añade su tarjeta. Al completar, Stripe dispara
//      `setup_intent.succeeded` → el webhook extiende el trial +30 días.
// ---------------------------------------------------------------------------

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
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return jsonResponse({ error: 'Stripe is not configured.' }, 503)
  }

  const stripe = await getStripe()

  // 1. Buscar el tenant en la DB
  const rows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.clerkOrgId, orgId))
    .limit(1)

  if (rows.length === 0) {
    return jsonResponse({ error: 'Tenant not found' }, 404)
  }

  const tenant = rows[0]

  // 2. Crear o reutilizar Stripe Customer
  let customerId = tenant.stripeCustomerId

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: tenant.name,
      metadata: {
        tenant_id: tenant.id,
        clerk_org_id: orgId,
      },
    })
    customerId = customer.id

    // Persistir el customerId inmediatamente
    await db
      .update(tenants)
      .set({ stripeCustomerId: customerId })
      .where(eq(tenants.clerkOrgId, orgId))
  }

  // 3. Crear Checkout Session en modo setup (solo captura tarjeta, sin cobro)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    customer: customerId,
    payment_method_types: ['card'],
    success_url: `${appUrl}/billing?setup=success`,
    cancel_url: `${appUrl}/billing?setup=cancel`,
    metadata: {
      clerk_org_id: orgId,
      purpose: 'trial_extension',
    },
  })

  // 4. Redirigir al checkout de Stripe
  return new Response(null, {
    status: 303,
    headers: { Location: session.url! },
  })
}

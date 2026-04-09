import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { tenants, users } from '@/db/schema'
import { eq } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Clerk webhook event types (subset)
// ---------------------------------------------------------------------------
interface OrganizationCreatedEvent {
  type: 'organization.created'
  data: {
    id: string
    name: string
  }
}

interface OrganizationMembershipCreatedEvent {
  type: 'organizationMembership.created'
  data: {
    role: string
    organization: {
      id: string
    }
    public_user_data: {
      user_id: string
      identifier: string // email
    }
  }
}

type ClerkWebhookEvent =
  | OrganizationCreatedEvent
  | OrganizationMembershipCreatedEvent
  | { type: string; data: unknown }

// ---------------------------------------------------------------------------
// POST /api/webhooks/clerk
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  // 1. Verify the webhook secret is configured
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    console.error('[clerk-webhook] CLERK_WEBHOOK_SECRET is not set')
    return new Response('Internal Server Error', { status: 500 })
  }

  // 2. Extract svix headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Bad Request: missing svix headers', { status: 400 })
  }

  // 3. Verify the payload signature
  const body = await req.text()
  let evt: ClerkWebhookEvent

  try {
    const wh = new Webhook(secret)
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkWebhookEvent
  } catch (err) {
    console.error('[clerk-webhook] Signature verification failed:', err)
    return new Response('Unauthorized', { status: 401 })
  }

  // 4. Handle events
  try {
    switch (evt.type) {
      case 'organization.created': {
        const { id, name } = (evt as OrganizationCreatedEvent).data

        // Trial híbrido: primeros 30 días sin tarjeta ('no_card' stage)
        const now = new Date()
        const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        await db
          .insert(tenants)
          .values({
            clerkOrgId: id,
            name,
            plan: 'free',
            trialStartedAt: now,
            trialEndsAt,
            trialStage: 'no_card',
            cardOnFile: false,
            proposalsUsed: 0,
            proposalsQuota: 20, // límite suave para fase sin tarjeta
          })
          .onConflictDoNothing()

        console.log(
          `[clerk-webhook] Tenant created: ${id} (${name}) | trial ends ${trialEndsAt.toISOString()}`
        )
        break
      }

      case 'organizationMembership.created': {
        const { role, organization, public_user_data } = (
          evt as OrganizationMembershipCreatedEvent
        ).data

        // Look up the tenant row by Clerk org ID
        const tenantRows = await db
          .select()
          .from(tenants)
          .where(eq(tenants.clerkOrgId, organization.id))
          .limit(1)

        if (tenantRows.length === 0) {
          // Tenant not found — the organization.created event may not have fired
          // yet (race condition). Log and return 200 so Clerk retries later.
          console.warn(
            `[clerk-webhook] Tenant not found for org ${organization.id} — skipping membership insert`
          )
          break
        }

        const tenant = tenantRows[0]

        await db
          .insert(users)
          .values({
            tenantId: tenant.id,
            clerkUserId: public_user_data.user_id,
            email: public_user_data.identifier,
            role: role === 'org:admin' ? 'admin' : 'member',
          })
          .onConflictDoNothing()

        console.log(
          `[clerk-webhook] User created: ${public_user_data.user_id} in tenant ${tenant.id}`
        )
        break
      }

      default:
        // Unknown event — return 200 so Clerk does not retry
        console.log(`[clerk-webhook] Unhandled event type: ${evt.type}`)
        break
    }
  } catch (err) {
    console.error('[clerk-webhook] DB error:', err)
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}

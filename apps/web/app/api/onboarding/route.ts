import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tenants } from '@/db/schema'
import { z } from 'zod/v4'

const OnboardingDataSchema = z.object({
  businessType: z.enum(['agency', 'consultancy', 'saas', 'freelancer', 'other']),
  industries: z.array(z.string()).min(1),
  services: z.array(z.string()).min(1),
  proposalSize: z.enum(['under5k', '5k-20k', '20k-50k', 'above50k']),
  tone: z.enum(['formal', 'consultative', 'direct']),
})

type OnboardingData = z.infer<typeof OnboardingDataSchema>

export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()

    // Validate the request body
    const validatedData = OnboardingDataSchema.parse(body)

    // Get the tenant from the database
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.clerkOrgId, orgId),
    })

    if (!tenant) {
      return Response.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Update the tenant with onboarding data and mark as completed
    const onboardingMetadata = {
      businessType: validatedData.businessType,
      industries: validatedData.industries,
      services: validatedData.services,
      proposalSize: validatedData.proposalSize,
      tone: validatedData.tone,
      completedAt: new Date().toISOString(),
    }

    await db
      .update(tenants)
      .set({
        metadata: onboardingMetadata as any, // metadata is JSONB
        onboardingCompleted: true,
      })
      .where(eq(tenants.id, tenant.id))

    return Response.json(
      { success: true, message: 'Onboarding completed successfully' },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Onboarding error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

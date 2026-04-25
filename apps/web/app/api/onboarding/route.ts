import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod/v4'

const OnboardingDataSchema = z.object({
  businessType: z.enum(['agency', 'consultancy', 'saas', 'freelancer', 'other']).nullable().optional(),
  industries: z.array(z.string()).optional().default([]),
  services: z.array(z.string()).optional().default([]),
  proposalSize: z.enum(['under5k', '5k-20k', '20k-50k', 'above50k']).nullable().optional(),
  tone: z.enum(['formal', 'consultative', 'direct']).nullable().optional(),
  skipped: z.boolean().optional().default(false),
})

export async function POST(req: Request) {
  try {
    const { tenantId } = await requireAuth()
    const admin = createAdminClient()

    const body = await req.json()
    const validatedData = OnboardingDataSchema.parse(body)

    const onboardingMetadata = {
      businessType: validatedData.businessType,
      industries: validatedData.industries,
      services: validatedData.services,
      proposalSize: validatedData.proposalSize,
      tone: validatedData.tone,
      skipped: validatedData.skipped,
      completedAt: new Date().toISOString(),
    }

    const { error } = await admin
      .from('tenants')
      .update({ metadata: onboardingMetadata, onboarding_completed: true })
      .eq('id', tenantId)

    if (error) throw new Error(error.message)

    return Response.json({ success: true }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Unauthenticated') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Onboarding error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

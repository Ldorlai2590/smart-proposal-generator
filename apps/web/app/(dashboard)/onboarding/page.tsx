import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export const metadata = {
  title: 'Onboarding | Smart Proposal Generator',
  description: 'Complete your profile to get started',
}

export default async function OnboardingPage() {
  const { userId, orgId } = await auth()

  // Redirect to sign-in if not authenticated
  if (!userId || !orgId) {
    redirect('/sign-in')
  }

  // TODO: Check if onboarding is already completed
  // For now, render the wizard directly
  // const tenant = await db.query.tenants.findFirst({
  //   where: eq(tenants.clerkOrgId, orgId),
  // })
  //
  // if (tenant?.onboardingCompleted) {
  //   redirect('/dashboard')
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-50">
      <OnboardingWizard />
    </div>
  )
}

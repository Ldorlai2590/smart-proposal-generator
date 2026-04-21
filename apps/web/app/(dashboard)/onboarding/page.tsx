import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export const metadata = {
  title: 'Onboarding | Smart Proposal Generator',
}

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.supabaseUserId, user.id),
  })

  if (tenant?.onboardingCompleted) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-50">
      <OnboardingWizard />
    </div>
  )
}

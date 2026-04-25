import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export const metadata = {
  title: 'Onboarding | Smart Proposal Generator',
}

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const admin = createAdminClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('onboarding_completed')
    .eq('supabase_user_id', user.id)
    .maybeSingle()

  if (tenant?.onboarding_completed) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-50">
      <OnboardingWizard />
    </div>
  )
}

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ensureTenant } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  // Create tenant on first login if it doesn't exist
  try {
    await ensureTenant(user.id, user.email ?? '')
  } catch (error) {
    console.error('[Dashboard] Failed to ensure tenant:', error)
  }

  const headersList = await headers()
  const pathname = headersList.get('x-next-pathname') ?? ''
  const isOnboardingPage = pathname.startsWith('/onboarding')

  if (!isOnboardingPage) {
    try {
      const admin = createAdminClient()
      const { data: tenant } = await admin
        .from('tenants')
        .select('id, onboarding_completed')
        .eq('supabase_user_id', user.id)
        .maybeSingle()
      if (tenant && !tenant.onboarding_completed) {
        redirect('/onboarding')
      }
    } catch (dbError) {
      console.error('[Dashboard] DB query failed:', dbError)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileNav />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ensureTenant } from '@/lib/auth'
import { db } from '@/lib/db'
import { tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'
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
    // Continue rendering — tenant creation may retry on next navigation
  }

  const headersList = await headers()
  const pathname = headersList.get('x-next-pathname') ?? ''
  const isOnboardingPage = pathname.startsWith('/onboarding')

  if (!isOnboardingPage) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.supabaseUserId, user.id),
    })
    if (tenant && !tenant.onboardingCompleted) {
      redirect('/onboarding')
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

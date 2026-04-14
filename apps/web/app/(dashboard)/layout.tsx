import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tenants } from '@/db/schema'
import { Sidebar } from '@/components/layout/Sidebar'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!DEMO_MODE) {
    const { auth } = await import('@clerk/nextjs/server')
    const { userId, orgId } = await auth()

    if (!userId) redirect('/sign-in')
    if (!orgId) redirect('/select-org')

    // Check if tenant has completed onboarding
    const headersList = await headers()
    const pathname = headersList.get('x-next-pathname') ?? ''
    const isOnboardingPage = pathname.startsWith('/onboarding')

    if (!isOnboardingPage) {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.clerkOrgId, orgId),
      })

      if (tenant && !tenant.onboardingCompleted) {
        redirect('/onboarding')
      }
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, orgId } = await auth()

  if (!userId) redirect('/sign-in')
  if (!orgId) redirect('/select-org')

  return (
    <div className="flex h-screen">
      {/* Sidebar irá aquí */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}

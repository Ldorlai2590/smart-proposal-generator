import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/landing/LandingPage'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

async function AuthRedirect() {
  if (DEMO_MODE) {
    redirect('/dashboard')
    return null
  }
  const { auth } = await import('@clerk/nextjs/server')
  const { userId } = await auth()
  if (userId) redirect('/dashboard')
  return null
}

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <AuthRedirect />
      </Suspense>
      <LandingPage />
    </>
  )
}

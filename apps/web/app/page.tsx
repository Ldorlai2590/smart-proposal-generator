import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/landing/LandingPage'

async function AuthRedirect() {
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

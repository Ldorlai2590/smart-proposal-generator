import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/select-org(.*)',
  '/api/webhooks(.*)',
])

const isApiRoute = createRouteMatcher(['/api/(.*)'])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  if (isApiRoute(request) && !isPublicRoute(request)) {
    const { orgId } = await auth()
    if (orgId) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('X-Tenant-ID', orgId)
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}

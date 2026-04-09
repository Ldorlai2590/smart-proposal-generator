import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/select-org(.*)',
  '/api/webhooks(.*)',
])

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/clients(.*)',
  '/proposals(.*)',
  '/analytics(.*)',
])

const isApiRoute = createRouteMatcher(['/api/(.*)'])

export default clerkMiddleware(async (auth, request) => {
  const { userId, orgId } = await auth()

  // 1. Allow public routes through without any auth checks
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  // 2. Redirect unauthenticated users to /sign-in
  if (!userId) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect_url', request.url)
    return NextResponse.redirect(signInUrl)
  }

  // 3. Redirect authenticated users with no active org to /select-org
  //    (only for protected app routes — skip for API routes to avoid redirect loops)
  if (!orgId && isProtectedRoute(request)) {
    const selectOrgUrl = new URL('/select-org', request.url)
    return NextResponse.redirect(selectOrgUrl)
  }

  // 4. Forward orgId as X-Tenant-ID header on protected API routes
  //    so FastAPI can enforce multi-tenant isolation
  if (isApiRoute(request) && orgId) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('X-Tenant-ID', orgId)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API and tRPC routes
    '/(api|trpc)(.*)',
  ],
}

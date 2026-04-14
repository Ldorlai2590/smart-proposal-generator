import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

function demoMiddleware(request: NextRequest) {
  // In demo mode, skip all Clerk auth — let everything through
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-next-pathname', request.nextUrl.pathname)
  requestHeaders.set('X-Demo-Mode', 'true')
  return NextResponse.next({ request: { headers: requestHeaders } })
}

async function clerkAuthMiddleware(request: NextRequest) {
  const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server')

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
    '/onboarding(.*)',
    '/billing(.*)',
  ])

  const handler = clerkMiddleware(async (auth, req) => {
    const { userId, orgId } = await auth()

    if (isPublicRoute(req)) {
      return NextResponse.next()
    }

    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }

    if (!orgId && isProtectedRoute(req)) {
      const selectOrgUrl = new URL('/select-org', req.url)
      return NextResponse.redirect(selectOrgUrl)
    }

    const requestHeaders = new Headers(req.headers)
    const pathname = req.nextUrl.pathname
    requestHeaders.set('x-next-pathname', pathname)

    if (orgId) {
      requestHeaders.set('X-Tenant-ID', orgId)
    }

    return NextResponse.next({ request: { headers: requestHeaders } })
  })

  return handler(request, {} as never)
}

export default function middleware(request: NextRequest) {
  if (DEMO_MODE) {
    return demoMiddleware(request)
  }
  return clerkAuthMiddleware(request)
}

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API and tRPC routes
    '/(api|trpc)(.*)',
  ],
}

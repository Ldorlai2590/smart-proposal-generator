import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const DEMO_MODE = process.env.DEMO_MODE === 'true'
const SESSION_COOKIE = 'spg-session'
const JWT_ISSUER = 'smart-proposal-generator'
const JWT_AUDIENCE = 'spg-web'
const MIN_SECRET_BYTES = 32

/**
 * Edge-runtime-safe secret resolver. Mirrors lib/auth-jwt.ts but uses Web Crypto
 * (crypto.getRandomValues) instead of node:crypto so it runs in middleware.
 *
 * Identical fail-fast rules:
 *  - JWT_SECRET present -> must be >= 32 bytes
 *  - Missing + !DEMO_MODE -> throw
 *  - Missing + DEMO_MODE -> ephemeral per-boot secret + warn once
 *
 * NOTE: Because middleware runs in a separate runtime from route handlers, its
 * ephemeral demo secret will NOT match the secret used by /api/auth/login. That is
 * acceptable only for a true demo deployment — in practice DEMO_MODE deployments
 * SHOULD set JWT_SECRET explicitly so signing and verification agree across runtimes.
 */
function resolveJwtSecret(): Uint8Array {
  const envSecret = process.env.JWT_SECRET
  if (envSecret && envSecret.length > 0) {
    const bytes = new TextEncoder().encode(envSecret)
    if (bytes.byteLength < MIN_SECRET_BYTES) {
      throw new Error(
        `JWT_SECRET must be at least ${MIN_SECRET_BYTES} bytes (got ${bytes.byteLength}). Use a strong random secret.`
      )
    }
    return bytes
  }

  if (!DEMO_MODE) {
    throw new Error('JWT_SECRET env var is required')
  }

  const buf = new Uint8Array(32)
  crypto.getRandomValues(buf)
  const hex = Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  // eslint-disable-next-line no-console
  console.warn(
    '[middleware] WARN: JWT_SECRET not set. DEMO_MODE=true detected — using an ephemeral per-boot secret in middleware. Set JWT_SECRET to allow cookies signed by the API route to be verified here.'
  )
  return new TextEncoder().encode(hex)
}

const secretKey = resolveJwtSecret()

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  try {
    await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })
    return true
  } catch {
    return false
  }
}

async function demoMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public pages — always accessible, no auth needed
  // Landing (/), login page, auth API, health, webhooks
  const isPublic =
    pathname === '/' ||
    pathname === '/demo-login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/webhooks')

  if (isPublic) {
    // If user is already logged in and visits login page, send to dashboard
    if (pathname === '/demo-login') {
      const hasSession = await hasValidSession(request)
      if (hasSession) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-next-pathname', pathname)
    requestHeaders.set('X-Demo-Mode', 'true')
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Redirect Clerk auth pages to /demo-login (JWT login)
  if (
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/select-org')
  ) {
    const hasSession = await hasValidSession(request)
    if (hasSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/demo-login', request.url))
  }

  // Protected routes: require valid JWT session
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/proposals') ||
    pathname.startsWith('/clients') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/api/clients') ||
    pathname.startsWith('/api/proposals')

  if (isProtected) {
    const hasSession = await hasValidSession(request)
    if (!hasSession) {
      if (pathname.startsWith('/api/')) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/demo-login', request.url))
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-next-pathname', pathname)
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

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const DEMO_MODE = process.env.DEMO_MODE === 'true'
const SESSION_COOKIE = 'spg-session'
const JWT_ISSUER = 'smart-proposal-generator'
const JWT_AUDIENCE = 'spg-web'
const MIN_SECRET_BYTES = 32

function resolveJwtSecret(): Uint8Array {
  const envSecret = process.env.JWT_SECRET
  if (envSecret && envSecret.length > 0) {
    const bytes = new TextEncoder().encode(envSecret)
    if (bytes.byteLength < MIN_SECRET_BYTES) {
      throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_BYTES} bytes`)
    }
    return bytes
  }
  if (!DEMO_MODE) {
    throw new Error('JWT_SECRET env var is required')
  }
  const buf = new Uint8Array(32)
  crypto.getRandomValues(buf)
  return new TextEncoder().encode(
    Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
  )
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

// ── Demo middleware (JWT-based) ───────────────────────────────────────────────

async function demoMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isPublic =
    pathname === '/' ||
    pathname === '/demo-login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/webhooks')

  if (isPublic) {
    if (pathname === '/demo-login') {
      const hasSession = await hasValidSession(request)
      if (hasSession) return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    const headers = new Headers(request.headers)
    headers.set('x-next-pathname', pathname)
    headers.set('X-Demo-Mode', 'true')
    return NextResponse.next({ request: { headers } })
  }

  if (
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/select-org')
  ) {
    const hasSession = await hasValidSession(request)
    if (hasSession) return NextResponse.redirect(new URL('/dashboard', request.url))
    return NextResponse.redirect(new URL('/demo-login', request.url))
  }

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
      if (pathname.startsWith('/api/')) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      return NextResponse.redirect(new URL('/demo-login', request.url))
    }
  }

  const headers = new Headers(request.headers)
  headers.set('x-next-pathname', pathname)
  headers.set('X-Demo-Mode', 'true')
  return NextResponse.next({ request: { headers } })
}

// ── Clerk middleware (production) ─────────────────────────────────────────────

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/select-org(.*)',
  '/api/webhooks(.*)',
  '/api/health(.*)',
  '/demo-login',
])

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/clients(.*)',
  '/proposals(.*)',
  '/analytics(.*)',
  '/onboarding(.*)',
  '/billing(.*)',
  '/settings(.*)',
])

const clerkHandler = clerkMiddleware(async (auth, req) => {
  const { userId, orgId } = await auth()
  const pathname = req.nextUrl.pathname

  if (isPublicRoute(req)) return NextResponse.next()

  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', req.url)
    return NextResponse.redirect(signInUrl)
  }

  if (!orgId && isProtectedRoute(req)) {
    return NextResponse.redirect(new URL('/select-org', req.url))
  }

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-next-pathname', pathname)
  if (orgId) requestHeaders.set('X-Tenant-ID', orgId)

  return NextResponse.next({ request: { headers: requestHeaders } })
})

// ── Entry point ───────────────────────────────────────────────────────────────

export default function middleware(request: NextRequest) {
  if (DEMO_MODE) return demoMiddleware(request)
  return clerkHandler(request, {} as never)
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}

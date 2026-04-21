import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATHS = [
  '/dashboard',
  '/proposals',
  '/clients',
  '/analytics',
  '/billing',
  '/onboarding',
  '/settings',
]

const AUTH_PATHS = ['/sign-in', '/sign-up', '/reset-password']

const EXCLUDED_PATHS = ['/auth/callback']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required by @supabase/ssr
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Skip auth checks for excluded paths (OAuth callbacks, public endpoints)
  if (EXCLUDED_PATHS.some((p) => pathname.startsWith(p))) {
    return supabaseResponse
  }

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p))

  // Redirect unauthenticated users from protected routes
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages (sign-in, sign-up, reset-password)
  // Covers both traditional and OAuth sessions
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (user) {
    supabaseResponse.headers.set('x-next-pathname', pathname)
    supabaseResponse.headers.set('X-User-ID', user.id)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Exclude Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Include API and tRPC routes, including OAuth callbacks (auth/callback)
    '/(api|trpc)(.*)',
  ],
}

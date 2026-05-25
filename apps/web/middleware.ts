import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase Auth session-refresh middleware.
 *
 * The Supabase SSR package uses short-lived JWTs stored in cookies. Calling
 * `supabase.auth.getUser()` on every request triggers a silent token refresh
 * when the JWT is near expiry — the new tokens are written back into the
 * response cookies before the page/route handler ever runs.
 *
 * WITHOUT this middleware, Server Components and API Route Handlers get stale
 * tokens after ~60 minutes, causing random 401s for legitimately-logged-in users.
 *
 * Matcher covers:
 *  - All dashboard pages           (/dashboard/*, /clients/*, /proposals/*, …)
 *  - All API routes the wizard hits (/api/proposals/stream, /api/analyze-url, …)
 *  - Auth callback                 (/auth/callback)
 *
 * Intentionally excluded (no session needed):
 *  - Static assets  (/_next/static/*)
 *  - Image optimizer (/_next/image)
 *  - Public assets  (/public/*)
 *  - robots.txt, sitemap.xml, favicon
 */
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
          // First write into the request so downstream reads see the fresh token.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Re-build the response so the updated cookies are forwarded to the browser.
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT call supabase.auth.getSession() here.
  // getSession() reads from the cookie and does NOT validate the token against
  // the Supabase Auth server — it can return stale/forged sessions.
  // getUser() makes the network call that validates the JWT and refreshes it.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect unauthenticated users away from protected routes.
  const isProtectedPage =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/clients') ||
    pathname.startsWith('/proposals') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/services') ||
    pathname.startsWith('/company') ||
    pathname.startsWith('/tracking')

  if (!user && isProtectedPage) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/sign-in'
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages.
  const isAuthPage =
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/forgot-password')

  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // Always return supabaseResponse (not a bare NextResponse.next()).
  // Returning a fresh NextResponse would drop the refreshed-token cookies.
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static   (static chunks)
     *  - _next/image    (image optimizer)
     *  - favicon.ico, robots.txt, sitemap.xml, manifest.json
     *  - Public folder assets (/*.png, /*.svg, etc.)
     *
     * We intentionally include /api/* so the session is refreshed before
     * route handlers run — critical for requireAuth() in API routes.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.json|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf)).*)',
  ],
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureTenant } from '@/lib/auth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') ?? 'signup' // signup, magiclink, recovery, email_change
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/dashboard'

  // Handle Supabase OAuth/auth errors early
  if (error) {
    const encodedDescription = errorDescription ? `&error_description=${encodeURIComponent(errorDescription)}` : ''
    return NextResponse.redirect(`${origin}/sign-in?error=${error}${encodedDescription}`)
  }

  // Handle password reset flow
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  // Handle OAuth and email confirmation callbacks
  if (code) {
    try {
      const supabase = await createClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[auth/callback] Session exchange failed:', exchangeError)
        return NextResponse.redirect(`${origin}/sign-in?error=auth_exchange_failed`)
      }

      if (!data.user) {
        console.error('[auth/callback] No user returned from exchange')
        return NextResponse.redirect(`${origin}/sign-in?error=no_user_returned`)
      }

      // Ensure tenant exists in database
      try {
        await ensureTenant(data.user.id, data.user.email ?? '')
      } catch (tenantError) {
        console.error('[auth/callback] Failed to ensure tenant:', tenantError)
        // Still redirect to dashboard — user session is valid even if DB is temporarily unavailable
        // The ensureTenant will be retried on next app load
      }

      return NextResponse.redirect(`${origin}${next}`)
    } catch (err) {
      console.error('[auth/callback] Unexpected error:', err)
      return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`)
    }
  }

  console.warn('[auth/callback] No code or error provided in callback')
  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`)
}

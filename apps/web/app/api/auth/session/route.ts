import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ authenticated: false }, { status: 401 })
  }
  return Response.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? user.email?.split('@')[0],
    },
  })
}

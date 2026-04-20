import { getSession } from '@/lib/auth-jwt'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ authenticated: false }, { status: 401 })
  }
  return Response.json({
    authenticated: true,
    user: {
      email: session.email,
      name: session.name,
      orgId: session.orgId,
      loginAt: session.loginAt,
    },
  })
}

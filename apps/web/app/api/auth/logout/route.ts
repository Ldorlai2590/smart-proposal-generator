import { clearSessionCookie } from '@/lib/auth-jwt'

export async function POST() {
  await clearSessionCookie()
  return Response.json({ success: true })
}

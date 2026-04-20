import { signSession, setSessionCookie } from '@/lib/auth-jwt'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return Response.json({ error: 'Formato de correo inválido' }, { status: 400 })
    }

    // Validate password (min 6 chars for demo)
    if (password.length < 6) {
      return Response.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    // Extract name from email (capitalize first letter of local part)
    const localPart = email.split('@')[0]
    const name = localPart
      .split(/[._-]/)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ')

    // Create signed JWT session
    const token = await signSession({
      email,
      name,
      orgId: 'demo',
    })

    await setSessionCookie(token)

    return Response.json({
      success: true,
      user: { email, name, orgId: 'demo' },
    })
  } catch (err) {
    console.error('[api/auth/login]', err)
    return Response.json({ error: 'Error de autenticación' }, { status: 500 })
  }
}

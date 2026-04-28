import { z } from 'zod/v4'
import { createClient } from '@/lib/supabase/server'

const PatchSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(120),
})

/**
 * PATCH /api/auth/profile — update authenticated user's display name.
 * Stored in Supabase auth.users.user_metadata.full_name.
 */
export async function PATCH(req: Request) {
  // 1. Auth FIRST
  const supabase = await createClient()
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser()

  if (getUserError || !user) {
    return Response.json({ error: 'No autenticado' }, { status: 401 })
  }

  // 2. Body parse
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 })
  }

  // 3. Schema validation
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase.auth.updateUser({
    data: { full_name: parsed.data.name },
  })

  if (error) {
    console.error('[api/auth/profile] update error:', error)
    return Response.json({ error: 'Error al actualizar perfil' }, { status: 500 })
  }

  return Response.json({
    success: true,
    user: {
      id: data.user?.id,
      email: data.user?.email,
      name: data.user?.user_metadata?.full_name ?? parsed.data.name,
    },
  })
}

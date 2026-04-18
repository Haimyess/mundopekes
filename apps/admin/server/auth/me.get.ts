// server/api/auth/me.get.ts
// Retorna el usuario actual. Útil para SSR y verificaciones server-side.

import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'No autenticado'
    })
  }

  // Verificar que tiene rol admin en metadata
  const isAdmin = user.user_metadata?.role === 'admin'
  if (!isAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Acceso denegado'
    })
  }

  return {
    id: user.id,
    email: user.email,
    role: user.user_metadata?.role
  }
})

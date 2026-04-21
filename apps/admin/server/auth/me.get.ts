// server/api/auth/me.get.ts
// Retorna el usuario actual. Útil para SSR y verificaciones server-side.

import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'No autenticado',
    })
  }

  // app_metadata solo es modificable por service role — es seguro
  const isAdmin = user.app_metadata?.role === 'admin'
  if (!isAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Acceso denegado',
    })
  }

  return {
    id: user.id,
    email: user.email,
    role: user.app_metadata?.role,
  }
})

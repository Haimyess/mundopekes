import { serverSupabaseUser } from '#supabase/server'

export async function requireAdminUser(event: Parameters<typeof serverSupabaseUser>[0]) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

  const user = await serverSupabaseUser(event)

  if (!user) {
    await logWarn(event, 'security', 'Unauthenticated request to admin endpoint', {
      ip,
      path: event.path,
    })
    throw createError({ statusCode: 401, message: 'No autenticado' })
  }

  if (user.app_metadata?.role !== 'admin') {
    await logWarn(event, 'security', 'Non-admin user attempted admin endpoint', {
      ip,
      userId: user.id,
      path: event.path,
    })
    throw createError({ statusCode: 403, message: 'Acceso denegado' })
  }

  return user
}

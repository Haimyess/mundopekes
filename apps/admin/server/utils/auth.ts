import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const MFA_ASSURANCE_LEVEL = 'aal2'

type AdminEvent = Parameters<typeof serverSupabaseUser>[0]

const hasVerifiedMfaFactor = async (event: AdminEvent): Promise<boolean> => {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client.auth.getUser()

  if (error || !data.user) {
    throw createError({ statusCode: 503, message: 'No se pudo verificar la sesión' })
  }

  return (data.user.factors ?? []).some((factor) => factor.status === 'verified')
}

export async function requireAdminUser(event: AdminEvent) {
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
      userId: user.sub,
      path: event.path,
    })
    throw createError({ statusCode: 403, message: 'Acceso denegado' })
  }

  if (user.aal !== MFA_ASSURANCE_LEVEL && (await hasVerifiedMfaFactor(event))) {
    await logWarn(event, 'security', 'Admin request without completed MFA', {
      ip,
      userId: user.sub,
      path: event.path,
    })
    throw createError({ statusCode: 403, message: 'Se requiere verificación en dos pasos' })
  }

  return user
}

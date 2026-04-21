export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login']
  if (publicRoutes.includes(to.path)) return

  const supabase = useSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return navigateTo('/login')
  }

  const isAdmin = user.app_metadata?.role === 'admin'
  if (!isAdmin) {
    await supabase.auth.signOut()
    return navigateTo('/login')
  }

  // Verificar que completó el segundo factor si tiene MFA activo
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const needsMfa = aalData?.nextLevel === 'aal2' && aalData?.nextLevel !== aalData?.currentLevel

  if (needsMfa) {
    return navigateTo('/login')
  }
})

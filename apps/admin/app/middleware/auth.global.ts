export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login']
  if (publicRoutes.includes(to.path)) return

  // getSession() reads the session from local storage — no network round-trip,
  // unlike getUser() which always revalidates against Supabase Auth. Running on
  // every navigation, getUser() here would add a network hop to every single
  // page change. The authoritative check still happens server-side via
  // requireAdminUser() (serverSupabaseUser) on every admin API endpoint — this
  // middleware is just the client-side UX gate.
  const supabase = useSupabaseClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  const user = session?.user

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

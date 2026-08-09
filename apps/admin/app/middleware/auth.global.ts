export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login']
  if (publicRoutes.includes(to.path)) return

  // getUser() always revalidates against Supabase Auth (unlike getSession(),
  // which only reads whatever's in local storage without checking if the
  // access token is still valid). This used to be getSession() for a faster
  // navigation, but that traded away the one thing that reliably catches a
  // stale/near-expiry token before the page renders — with getSession(), the
  // client would wave the user through to a page whose data-fetch then hit
  // the server and legitimately 401'd, with nothing to send them back to
  // /login. Correctness over the extra round-trip.
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

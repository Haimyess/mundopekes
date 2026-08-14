// getUser() always revalidates against Supabase Auth (unlike getSession(),
// which only reads whatever's in local storage without checking if the
// access token is still valid). This used to be getSession() for a faster
// navigation, but that traded away the one thing that reliably catches a
// stale/near-expiry token before the page renders — with getSession(), the
// client would wave the user through to a page whose data-fetch then hit
// the server and legitimately 401'd, with nothing to send them back to
// /login. Correctness over the extra round-trip.
//
// Still, paying that round-trip on *every single navigation* (even three
// clicks in a row, seconds apart) is real, noticeable latency stacked on
// top of the page's own data loading. requireAdminUser() (server/utils/
// auth.ts, enforced on every /api/** request via server/middleware/
// require-admin.ts) is the actual, independent security boundary — this
// middleware only exists to avoid flashing protected content client-side
// before that boundary would reject a bad request anyway. So it's safe to
// skip re-revalidating if the last successful check was recent: a stale
// token still gets caught (by the next real revalidation, or by the
// 401 → /login interceptor in plugins/auth-redirect.ts if a page's own
// fetch hits the server first), just not necessarily on the very next
// click after the previous one.
const AUTH_CACHE_MS = 30_000

export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login']
  if (publicRoutes.includes(to.path)) return

  // useState() must be called inside the middleware (a Nuxt-context
  // function), not at module top-level — it needs useNuxtApp() underneath,
  // which only exists once Nuxt has an active request/app instance.
  const authCheckedAt = useState<number>('auth-checked-at', () => 0)
  if (Date.now() - authCheckedAt.value < AUTH_CACHE_MS) return

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

  authCheckedAt.value = Date.now()
})

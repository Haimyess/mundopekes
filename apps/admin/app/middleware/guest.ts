// app/middleware/guest.ts
// Si ya tenés sesión, redirige al dashboard.

export default defineNuxtRouteMiddleware(async () => {
  const supabase = useSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user

  if (user && user.app_metadata?.role === 'admin') {
    return navigateTo('/')
  }
})

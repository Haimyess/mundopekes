// app/middleware/guest.ts
// Si ya tenés sesión, redirige al dashboard.

export default defineNuxtRouteMiddleware(async () => {
  const supabase = useSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && user.app_metadata?.role === 'admin') {
    return navigateTo('/')
  }
})

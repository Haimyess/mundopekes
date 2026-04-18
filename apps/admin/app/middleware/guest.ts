// app/middleware/guest.ts
// Si ya tenés sesión, redirige al dashboard.

export default defineNuxtRouteMiddleware(async () => {
  const supabase = useSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    return navigateTo('/')
  }
})

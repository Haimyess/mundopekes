export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login']
  if (publicRoutes.includes(to.path)) return

  const supabase = useSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return navigateTo('/login')
  }
})

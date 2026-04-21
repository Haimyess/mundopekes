export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login']
  if (publicRoutes.includes(to.path)) return

  const supabase = useSupabaseClient()

  // getUser() valida contra el servidor, no usa caché local
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return navigateTo('/login')
  }

  // Verificar rol admin en app_metadata (no modificable por el usuario)
  const isAdmin = user.app_metadata?.role === 'admin'
  if (!isAdmin) {
    await supabase.auth.signOut()
    return navigateTo('/login')
  }
})

// app/plugins/auth.global.ts
// Plugin global que protege todas las rutas excepto /login.
// Se ejecuta en cada navegación.

export default defineNuxtPlugin(() => {
  addRouteMiddleware('global-auth', async (to) => {
    // Rutas que no requieren auth
    const publicRoutes = ['/login']
    if (publicRoutes.includes(to.path)) return

    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return navigateTo('/login')
    }
  }, { global: true })
})
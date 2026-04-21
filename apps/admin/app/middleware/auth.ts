// Este middleware ya no es necesario — auth.global.ts cubre todo.
// Se mantiene por si alguna página lo referencia explícitamente,
// pero delega en el global.

export default defineNuxtRouteMiddleware(async () => {
  const supabase = useSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return navigateTo('/login')
  }
})

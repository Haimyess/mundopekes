export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const loading = ref(false)

  const isAdmin = computed(() => user.value?.app_metadata?.role === 'admin')

  const login = async (email: string, password: string) => {
    const toast = useToast()
    const router = useRouter()

    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      const mostrarErrorCredenciales = () =>
        toast.add({
          title: 'Email o contraseña incorrectos',
          color: 'error',
          icon: 'i-lucide-alert-circle',
        })

      if (error) {
        mostrarErrorCredenciales()
        return
      }

      const isAdminUser = data.user?.app_metadata?.role === 'admin'
      if (!isAdminUser) {
        await supabase.auth.signOut()
        mostrarErrorCredenciales()
        return
      }

      toast.add({
        title: '¡Bienvenido!',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
      await router.push('/')
    } catch (error: any) {
      toast.add({
        title: 'Error inesperado',
        description: error.message,
        color: 'error',
        icon: 'i-lucide-alert-circle',
      })
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    const toast = useToast()
    const router = useRouter()

    loading.value = true
    try {
      await supabase.auth.signOut()
      await router.push('/login')
    } catch (error: any) {
      toast.add({
        title: 'Error al cerrar sesión',
        description: error.message,
        color: 'error',
      })
    } finally {
      loading.value = false
    }
  }

  return { user, isAdmin, loading, login, logout }
}

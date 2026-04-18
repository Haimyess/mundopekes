// app/composables/useAuth.ts

export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const loading = ref(false)

  const login = async (email: string, password: string) => {
    // ✅ Mover aquí adentro — se llaman dentro de una función async
    const toast = useToast()
    const router = useRouter()

    loading.value = true
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      toast.add({
        title: '¡Bienvenido!',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      await router.push('/')
    } catch (error: any) {
      toast.add({
        title: 'Error al iniciar sesión',
        description: traducirError(error.message),
        color: 'error',
        icon: 'i-lucide-alert-circle'
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
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }

  const traducirError = (message: string): string => {
    const errores: Record<string, string> = {
      'Invalid login credentials': 'Email o contraseña incorrectos',
      'Email not confirmed': 'Confirmá tu email antes de continuar',
      'Too many requests': 'Demasiados intentos, esperá unos minutos',
      'User not found': 'No existe un usuario con ese email'
    }
    return errores[message] ?? message
  }

  return { user, loading, login, logout }
}

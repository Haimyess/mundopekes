export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const loading = ref(false)

  const isAdmin = computed(() => user.value?.app_metadata?.role === 'admin')

  // Estado intermedio del flujo MFA
  const mfaRequired = ref(false)

  const login = async (email: string, password: string) => {
    const toast = useToast()
    const router = useRouter()

    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const isAdminUser = data.user?.app_metadata?.role === 'admin'
      if (!isAdminUser) {
        await supabase.auth.signOut()
        throw new Error('Acceso denegado: no tenés permisos de administrador')
      }

      // Verificar si necesita segundo factor
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      if (aalData?.nextLevel === 'aal2' && aalData?.nextLevel !== aalData?.currentLevel) {
        // Tiene MFA configurado — necesita el código
        mfaRequired.value = true
        return
      }

      // Sin MFA configurado — entra directo (con aviso)
      toast.add({
        title: '¡Bienvenido!',
        description: 'Recomendamos activar MFA en Configuración → Seguridad',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
      await router.push('/')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.add({
        title: 'Error al iniciar sesión',
        description: traducirError(message),
        color: 'error',
        icon: 'i-lucide-alert-circle',
      })
    } finally {
      loading.value = false
    }
  }

  const verifyMfa = async (code: string) => {
    const toast = useToast()
    const router = useRouter()

    loading.value = true
    try {
      // Obtener el factor ID del usuario actual
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (factorsError) throw factorsError

      const totpFactor = factorsData?.totp?.[0]
      if (!totpFactor) throw new Error('No se encontró factor MFA')

      // Crear challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      })
      if (challengeError) throw challengeError

      // Verificar código
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      })
      if (verifyError) throw verifyError

      mfaRequired.value = false
      toast.add({
        title: '¡Bienvenido!',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
      await router.push('/')
    } catch {
      toast.add({
        title: 'Código incorrecto',
        description: 'Verificá el código en tu app autenticadora',
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
    } catch (error) {
      toast.add({
        title: 'Error al cerrar sesión',
        description: error instanceof Error ? error.message : String(error),
        color: 'error',
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
      'User not found': 'No existe un usuario con ese email',
      'Acceso denegado: no tenés permisos de administrador':
        'Acceso denegado: no tenés permisos de administrador',
    }
    return errores[message] ?? message
  }

  return { user, isAdmin, loading, mfaRequired, login, verifyMfa, logout }
}

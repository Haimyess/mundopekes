export const useAuth = () => {
  const { t } = useI18n()
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
        throw new Error('ADMIN_ACCESS_DENIED')
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
        title: t('auth.toast.welcomeTitle'),
        description: t('auth.toast.welcomeMfaHint'),
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
      await router.push('/')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.add({
        title: t('auth.toast.loginErrorTitle'),
        description:
          message === 'ADMIN_ACCESS_DENIED'
            ? t('auth.toast.accessDeniedError')
            : traducirError(message),
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
        title: t('auth.toast.welcomeTitle'),
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
      await router.push('/')
    } catch {
      toast.add({
        title: t('auth.toast.wrongCodeTitle'),
        description: t('auth.toast.wrongCodeDescription'),
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
      // Mismo useState que auth.global.ts — resetea el cache de 30s del
      // middleware para que un login posterior en la misma pestaña siempre
      // revalide de una, en vez de heredar el timestamp de esta sesión.
      useState<number>('auth-checked-at', () => 0).value = 0
      await router.push('/login')
    } catch (error) {
      toast.add({
        title: t('auth.toast.logoutErrorTitle'),
        description: error instanceof Error ? error.message : String(error),
        color: 'error',
      })
    } finally {
      loading.value = false
    }
  }

  // Supabase siempre devuelve estos mensajes en inglés — se mapean a la
  // key de i18n correspondiente; si no hay match, se muestra tal cual.
  const traducirError = (message: string): string => {
    const keys: Record<string, string> = {
      'Invalid login credentials': 'auth.errors.invalidCredentials',
      'Email not confirmed': 'auth.errors.emailNotConfirmed',
      'Too many requests': 'auth.errors.tooManyRequests',
      'User not found': 'auth.errors.userNotFound',
    }
    const key = keys[message]
    return key ? t(key) : message
  }

  return { user, isAdmin, loading, mfaRequired, login, verifyMfa, logout }
}

export type CookieConsentChoice = 'all' | 'necessary'

export const COOKIE_CONSENT_NAME = 'mp_cookie_consent'
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

const CONSENT_CHOICES: readonly CookieConsentChoice[] = ['all', 'necessary']

const isConsentChoice = (value: unknown): value is CookieConsentChoice =>
  CONSENT_CHOICES.includes(value as CookieConsentChoice)

export const useCookieConsent = () => {
  const consentCookie = useCookie<CookieConsentChoice | null>(COOKIE_CONSENT_NAME, {
    maxAge: COOKIE_CONSENT_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: !import.meta.dev,
    default: () => null,
  })
  const { gtag, initialize } = useGtag()

  const choice = computed(() => (isConsentChoice(consentCookie.value) ? consentCookie.value : null))
  const hasDecided = computed(() => choice.value !== null)
  const isAnalyticsAllowed = computed(() => choice.value === 'all')

  const enableAnalytics = () => {
    gtag('consent', 'update', { analytics_storage: 'granted' })
    initialize()
  }

  const acceptAll = () => {
    consentCookie.value = 'all'
    enableAnalytics()
  }

  const acceptNecessaryOnly = () => {
    consentCookie.value = 'necessary'
  }

  const resetConsent = () => {
    consentCookie.value = null
  }

  return {
    choice,
    hasDecided,
    isAnalyticsAllowed,
    acceptAll,
    acceptNecessaryOnly,
    enableAnalytics,
    resetConsent,
  }
}

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const { cookieStore, mockGtag, mockInitialize, cookieOptions } = vi.hoisted(() => ({
  cookieStore: { value: null as unknown },
  mockGtag: vi.fn(),
  mockInitialize: vi.fn(),
  cookieOptions: { last: null as unknown },
}))

vi.mock('../../node_modules/nuxt/dist/app/composables/cookie.js', () => ({
  useCookie: (_name: string, options: unknown) => {
    cookieOptions.last = options
    const cookie = ref(cookieStore.value)
    return new Proxy(cookie, {
      set(target, key, value) {
        if (key === 'value') cookieStore.value = value
        return Reflect.set(target, key, value)
      },
    })
  },
}))

vi.mock('../../node_modules/nuxt-gtag/dist/runtime/composables/useGtag.js', () => ({
  useGtag: () => ({ gtag: mockGtag, initialize: mockInitialize }),
}))

const { useCookieConsent, COOKIE_CONSENT_MAX_AGE_SECONDS } =
  await import('~/app/composables/useCookieConsent')

describe('useCookieConsent', () => {
  beforeEach(() => {
    cookieStore.value = null
    vi.clearAllMocks()
  })

  it('starts undecided and without analytics', () => {
    const { hasDecided, isAnalyticsAllowed, choice } = useCookieConsent()
    expect(hasDecided.value).toBe(false)
    expect(isAnalyticsAllowed.value).toBe(false)
    expect(choice.value).toBeNull()
  })

  it('stores the choice for six months with a lax same-site policy', () => {
    useCookieConsent()
    expect(cookieOptions.last).toMatchObject({
      maxAge: COOKIE_CONSENT_MAX_AGE_SECONDS,
      sameSite: 'lax',
    })
    expect(COOKIE_CONSENT_MAX_AGE_SECONDS).toBe(15552000)
  })

  it('grants analytics and loads the Google tag when accepting all', () => {
    const { acceptAll, hasDecided, isAnalyticsAllowed } = useCookieConsent()
    acceptAll()
    expect(cookieStore.value).toBe('all')
    expect(hasDecided.value).toBe(true)
    expect(isAnalyticsAllowed.value).toBe(true)
    expect(mockGtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'granted' })
    expect(mockInitialize).toHaveBeenCalledOnce()
  })

  it('never loads the Google tag when accepting only necessary cookies', () => {
    const { acceptNecessaryOnly, hasDecided, isAnalyticsAllowed } = useCookieConsent()
    acceptNecessaryOnly()
    expect(cookieStore.value).toBe('necessary')
    expect(hasDecided.value).toBe(true)
    expect(isAnalyticsAllowed.value).toBe(false)
    expect(mockGtag).not.toHaveBeenCalled()
    expect(mockInitialize).not.toHaveBeenCalled()
  })

  it('treats a tampered cookie value as undecided', () => {
    cookieStore.value = 'everything'
    const { hasDecided, isAnalyticsAllowed } = useCookieConsent()
    expect(hasDecided.value).toBe(false)
    expect(isAnalyticsAllowed.value).toBe(false)
  })

  it('lets the visitor withdraw the decision', () => {
    cookieStore.value = 'all'
    const { resetConsent, hasDecided } = useCookieConsent()
    resetConsent()
    expect(cookieStore.value).toBeNull()
    expect(hasDecided.value).toBe(false)
  })
})

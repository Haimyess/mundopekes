import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: { value: 'es' } }),
}))

const stubs = {
  UIcon: true,
}

function mockUserAgent(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: ua,
  })
}

function mockMatchMedia(standaloneMatches: boolean) {
  window.matchMedia = vi.fn(() => ({
    matches: standaloneMatches,
    media: '(display-mode: standalone)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

const PwaInstallPrompt = (await import('~/app/components/pwa/PwaInstallPrompt.vue')).default

describe('PwaInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear()
    mockMatchMedia(false)
    mockUserAgent(ANDROID_UA)
    // @ts-expect-error test-only cleanup of iOS legacy flag between cases
    delete window.navigator.standalone
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is hidden by default (no beforeinstallprompt, not iOS)', async () => {
    const wrapper = mount(PwaInstallPrompt, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('.pwa-install-prompt').exists()).toBe(false)
  })

  it('is hidden when already running standalone', async () => {
    mockMatchMedia(true)
    const wrapper = mount(PwaInstallPrompt, { global: { stubs } })
    await flushPromises()
    window.dispatchEvent(new Event('beforeinstallprompt'))
    await flushPromises()
    expect(wrapper.find('.pwa-install-prompt').exists()).toBe(false)
  })

  it('shows the Android install CTA after beforeinstallprompt fires', async () => {
    const wrapper = mount(PwaInstallPrompt, { global: { stubs } })
    await flushPromises()

    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => void
      userChoice: Promise<{ outcome: string }>
    }
    event.prompt = vi.fn()
    event.userChoice = Promise.resolve({ outcome: 'accepted' })
    window.dispatchEvent(event)
    await flushPromises()

    expect(wrapper.find('.pwa-install-prompt').exists()).toBe(true)
    expect(wrapper.find('.pwa-install-prompt__cta').exists()).toBe(true)
  })

  it('calls prompt() and dismisses after tapping install', async () => {
    const wrapper = mount(PwaInstallPrompt, { global: { stubs } })
    await flushPromises()

    const promptFn = vi.fn()
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => void
      userChoice: Promise<{ outcome: string }>
    }
    event.prompt = promptFn
    event.userChoice = Promise.resolve({ outcome: 'accepted' })
    window.dispatchEvent(event)
    await flushPromises()

    await wrapper.find('.pwa-install-prompt__cta').trigger('click')
    await flushPromises()

    expect(promptFn).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.pwa-install-prompt').exists()).toBe(false)
    expect(localStorage.getItem('pwa-install-dismissed')).toBe('true')
  })

  it('shows the static iOS banner (no CTA) on iOS without beforeinstallprompt', async () => {
    mockUserAgent(IOS_UA)
    const wrapper = mount(PwaInstallPrompt, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('.pwa-install-prompt').exists()).toBe(true)
    expect(wrapper.find('.pwa-install-prompt__cta').exists()).toBe(false)
  })

  it('stays hidden on a fresh mount once dismissed was persisted', async () => {
    localStorage.setItem('pwa-install-dismissed', 'true')
    mockUserAgent(IOS_UA)
    const wrapper = mount(PwaInstallPrompt, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('.pwa-install-prompt').exists()).toBe(false)
  })

  it('dismiss button hides the banner and persists the choice', async () => {
    mockUserAgent(IOS_UA)
    const wrapper = mount(PwaInstallPrompt, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('.pwa-install-prompt').exists()).toBe(true)

    await wrapper.find('.pwa-install-prompt__dismiss').trigger('click')
    await flushPromises()

    expect(wrapper.find('.pwa-install-prompt').exists()).toBe(false)
    expect(localStorage.getItem('pwa-install-dismissed')).toBe('true')
  })
})

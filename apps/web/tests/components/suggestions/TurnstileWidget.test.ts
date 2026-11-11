import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const runtimeConfig = { public: { turnstileSiteKey: '1x00000000000000000000AA' } }

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'ru' } }),
}))
vi.mock('../../../node_modules/nuxt/dist/app/nuxt.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRuntimeConfig: () => runtimeConfig,
}))

const TurnstileWidget = (await import('~/app/components/suggestions/TurnstileWidget.vue')).default

type RenderOptions = Record<string, (value?: string) => void> & {
  sitekey: string
  language: string
}

function installTurnstile() {
  const api = {
    options: null as RenderOptions | null,
    render: vi.fn((_element: HTMLElement, options: RenderOptions) => {
      api.options = options
      return 'widget-1'
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  }
  window.turnstile = api as unknown as Window['turnstile']
  return api
}

describe('SuggestionsTurnstileWidget', () => {
  beforeEach(() => {
    runtimeConfig.public.turnstileSiteKey = '1x00000000000000000000AA'
  })

  afterEach(() => {
    delete window.turnstile
    document.getElementById('cf-turnstile-script')?.remove()
  })

  it('renders the challenge with the site key and the current language', async () => {
    const api = installTurnstile()
    mount(TurnstileWidget)
    await flushPromises()
    expect(api.render).toHaveBeenCalledOnce()
    expect(api.options).toMatchObject({ sitekey: '1x00000000000000000000AA', language: 'ru' })
  })

  it('emits verify, expire and fail from the challenge callbacks', async () => {
    const api = installTurnstile()
    const wrapper = mount(TurnstileWidget)
    await flushPromises()
    api.options!.callback!('token-123')
    api.options!['expired-callback']!()
    api.options!['error-callback']!()
    expect(wrapper.emitted('verify')).toEqual([['token-123']])
    expect(wrapper.emitted('expire')).toHaveLength(1)
    expect(wrapper.emitted('fail')).toHaveLength(1)
  })

  it('resets and removes the rendered widget', async () => {
    const api = installTurnstile()
    const wrapper = mount(TurnstileWidget)
    await flushPromises()
    ;(wrapper.vm as unknown as { reset: () => void }).reset()
    expect(api.reset).toHaveBeenCalledWith('widget-1')
    wrapper.unmount()
    expect(api.remove).toHaveBeenCalledWith('widget-1')
  })

  it('injects the Cloudflare script once when it is not loaded yet', async () => {
    mount(TurnstileWidget)
    mount(TurnstileWidget)
    await flushPromises()
    const scripts = document.querySelectorAll('#cf-turnstile-script')
    expect(scripts).toHaveLength(1)
    expect((scripts[0] as HTMLScriptElement).src).toContain('render=explicit')
  })

  it('announces that verification is unavailable when the script fails', async () => {
    const wrapper = mount(TurnstileWidget)
    document.getElementById('cf-turnstile-script')!.dispatchEvent(new Event('error'))
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('forms.verificationUnavailable')
    expect(wrapper.emitted('fail')).toHaveLength(1)
  })

  it('announces that verification is unavailable without a site key', async () => {
    runtimeConfig.public.turnstileSiteKey = ''
    const wrapper = mount(TurnstileWidget)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('forms.verificationUnavailable')
    expect(document.getElementById('cf-turnstile-script')).toBeNull()
  })
})

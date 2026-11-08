import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, ref } from 'vue'

const { consentState, mockAcceptAll, mockAcceptNecessaryOnly } = vi.hoisted(() => ({
  consentState: { hasDecided: false },
  mockAcceptAll: vi.fn(),
  mockAcceptNecessaryOnly: vi.fn(),
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

vi.mock('~/app/composables/useCookieConsent', () => ({
  useCookieConsent: () => ({
    hasDecided: computed(() => ref(consentState.hasDecided).value),
    acceptAll: mockAcceptAll,
    acceptNecessaryOnly: mockAcceptNecessaryOnly,
  }),
}))

const UiButtonStub = defineComponent({
  name: 'UiButton',
  props: { variant: { type: String, default: 'primary' } },
  emits: ['click'],
  setup(props, { slots, emit, attrs }) {
    return () =>
      h(
        'button',
        { ...attrs, 'data-variant': props.variant, onClick: () => emit('click') },
        slots.default?.()
      )
  },
})

const NuxtLinkStub = defineComponent({
  props: { to: { type: String, required: true } },
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

const CookieConsentBanner = (await import('~/app/components/cookie/CookieConsentBanner.vue'))
  .default

const mountBanner = () =>
  mount(CookieConsentBanner, {
    global: { stubs: { UiButton: UiButtonStub, NuxtLink: NuxtLinkStub } },
  })

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    consentState.hasDecided = false
    vi.clearAllMocks()
  })

  it('is shown until the visitor decides', () => {
    expect(mountBanner().find('section').exists()).toBe(true)
  })

  it('is hidden once a decision exists', () => {
    consentState.hasDecided = true
    expect(mountBanner().find('section').exists()).toBe(false)
  })

  it('is labelled and described for assistive technology', () => {
    const section = mountBanner().find('section')
    const title = section.find(`#${section.attributes('aria-labelledby')}`)
    const description = section.find(`#${section.attributes('aria-describedby')}`)
    expect(title.text()).toBe('cookieConsent.title')
    expect(description.text()).toContain('cookieConsent.description')
  })

  it('links to the privacy policy', () => {
    expect(mountBanner().find('a').attributes('href')).toBe('/privacy')
  })

  it('gives both choices the same visual weight', () => {
    const variants = mountBanner()
      .findAll('button')
      .map((button) => button.attributes('data-variant'))
    expect(variants).toHaveLength(2)
    expect(new Set(variants).size).toBe(1)
  })

  it('accepts all cookies', async () => {
    await mountBanner().find('[data-test="consent-all"]').trigger('click')
    expect(mockAcceptAll).toHaveBeenCalledOnce()
    expect(mockAcceptNecessaryOnly).not.toHaveBeenCalled()
  })

  it('accepts only necessary cookies', async () => {
    await mountBanner().find('[data-test="consent-necessary"]').trigger('click')
    expect(mockAcceptNecessaryOnly).toHaveBeenCalledOnce()
    expect(mockAcceptAll).not.toHaveBeenCalled()
  })
})

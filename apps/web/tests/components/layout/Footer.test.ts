import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h } from 'vue'

const { mockSwitchLocale, mockResetConsent } = vi.hoisted(() => ({
  mockSwitchLocale: vi.fn(),
  mockResetConsent: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    locale: { value: 'es' },
  }),
}))
vi.mock('~/app/composables/useLanguageSwitch', () => ({
  useLanguageSwitch: () => ({
    locales: [
      { code: 'es', name: 'Español' },
      { code: 'ru', name: 'Русский' },
    ],
    currentLocale: computed(() => 'es'),
    switchLocale: mockSwitchLocale,
  }),
}))
vi.mock('~/app/composables/useCookieConsent', () => ({
  useCookieConsent: () => ({ resetConsent: mockResetConsent }),
}))

const NuxtLinkStub = defineComponent({
  name: 'NuxtLink',
  props: { to: { type: String, required: true } },
  setup:
    (props, { slots, attrs }) =>
    () =>
      h('a', { ...attrs, href: props.to }, slots.default?.()),
})
const UiAccordionStub = defineComponent({
  name: 'UiAccordion',
  props: { items: { type: Array, required: true } },
  setup:
    (props, { slots }) =>
    () =>
      h(
        'div',
        { 'data-stub': 'accordion' },
        (props.items as unknown[]).map((item) => slots.panel?.({ item }))
      ),
})
const LayoutLogoStub = defineComponent({ name: 'LayoutLogo', setup: () => () => h('span', 'logo') })

const Footer = (await import('~/app/components/Layout/Footer.vue')).default

const mountFooter = () =>
  mount(Footer, {
    global: {
      stubs: { NuxtLink: NuxtLinkStub, UiAccordion: UiAccordionStub, LayoutLogo: LayoutLogoStub },
    },
  })

describe('LayoutFooter', () => {
  beforeEach(() => {
    mockSwitchLocale.mockReset()
    mockResetConsent.mockReset()
  })

  it('links to real pages and to city and occasion searches', () => {
    const hrefs = [
      ...new Set(
        mountFooter()
          .findAll('a')
          .map((link) => link.attributes('href'))
      ),
    ]
    expect(hrefs).toEqual(
      expect.arrayContaining([
        '/about',
        '/business',
        '/privacy',
        '/terms',
        '/search?free=true',
        '/search?when=shabat',
        '/search?when=occasion:hanukkah',
        '/search?where=city:tel-aviv',
        '/search?where=city:modiin',
      ])
    )
    expect(hrefs.filter((href) => href!.startsWith('/search?where=city:'))).toHaveLength(8)
  })

  it('names cities in the current language', () => {
    const cityLink = mountFooter().find('a[href="/search?where=city:jerusalem"]')
    expect(cityLink.text()).toBe('Jerusalén')
  })

  it('reopens cookie preferences from the cookies link', async () => {
    const wrapper = mountFooter()
    const cookieButtons = wrapper
      .findAll('button')
      .filter((button) => button.text() === 'footer.links.cookies')
    expect(cookieButtons.length).toBeGreaterThan(0)
    await cookieButtons[0]!.trigger('click')
    expect(mockResetConsent).toHaveBeenCalledOnce()
  })

  it('switches language from the language list', async () => {
    const wrapper = mountFooter()
    const russian = wrapper
      .findAll('.layout-footer__language')
      .find((button) => button.attributes('lang') === 'ru')!
    await russian.trigger('click')
    expect(mockSwitchLocale).toHaveBeenCalledWith('ru')
    expect(wrapper.find('.layout-footer__language[lang="es"]').attributes('aria-current')).toBe(
      'true'
    )
  })

  it('labels the footer navigation and shows the current year', () => {
    const wrapper = mountFooter()
    expect(wrapper.find('nav').attributes('aria-label')).toBe('footer.nav')
    expect(wrapper.text()).toContain(`footer.copyright:{"year":${new Date().getFullYear()}}`)
  })
})

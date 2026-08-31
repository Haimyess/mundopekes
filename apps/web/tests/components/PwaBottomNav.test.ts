import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { __resetStore } from '../__mocks__/nuxt-state'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: { value: 'es' } }),
}))

const __mockRoute = { path: '/' }
vi.mock('nuxt/app', () => ({ useRoute: () => __mockRoute }))

const mockOpenContact = vi.fn()
vi.mock('~/app/composables/useContactForm', () => ({
  useContactForm: () => ({ open: mockOpenContact }),
}))

const mockGetNavCategoriesWithChildren = vi.fn().mockResolvedValue([
  {
    id: '1',
    name_i18n: { es: 'Parques' },
    slug: 'parques',
    icon: null,
    children: [
      { id: '1a', name_i18n: { es: 'Parques acuáticos' }, slug: 'parques-acuaticos', icon: null },
    ],
  },
  { id: '2', name_i18n: { es: 'Museos' }, slug: 'museos', icon: null, children: [] },
])
vi.mock('~/app/composables/useCategories', () => ({
  useCategories: () => ({ getNavCategoriesWithChildren: mockGetNavCategoriesWithChildren }),
}))

// SuggestionsSuggestionWizard (auto-import global) internamente importa
// useSuggestionWizard vía el alias '~' real de Nuxt (apunta a app/), que
// no coincide con el alias '~' de este vitest.config.ts (apunta a la raíz
// del paquete) — se mockea el componente entero para no arrastrar esa
// resolución rota a este test, que no necesita renderizarlo de verdad.
vi.mock('~/app/components/suggestions/SuggestionWizard.vue', () => ({
  default: { name: 'SuggestionsSuggestionWizard', props: ['open'], template: '<div />' },
}))

const stubs = {
  NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] },
  UIcon: true,
  UiDrawer: {
    template: '<div><slot /><slot name="body" /></div>',
    props: ['open', 'title', 'maxHeight'],
  },
  SuggestionsSuggestionWizard: {
    template: '<div />',
    props: ['open'],
  },
}

beforeEach(() => {
  __resetStore()
  mockOpenContact.mockClear()
  mockGetNavCategoriesWithChildren.mockClear()
  __mockRoute.path = '/'
})

afterEach(() => {
  vi.clearAllMocks()
})

const PwaBottomNav = (await import('~/app/components/pwa/PwaBottomNav.vue')).default

describe('PwaBottomNav', () => {
  it('renders 5 items: home, buscar, categorías, sugerir, contacto', () => {
    const wrapper = mount(PwaBottomNav, { global: { stubs } })
    expect(wrapper.findAll('.pwa-bottom-nav__item')).toHaveLength(5)
  })

  it('marks Home active on "/"', () => {
    __mockRoute.path = '/'
    const wrapper = mount(PwaBottomNav, { global: { stubs } })
    const items = wrapper.findAll('.pwa-bottom-nav__item')
    expect(items[0]?.classes()).toContain('pwa-bottom-nav__item--active')
    expect(items[1]?.classes()).not.toContain('pwa-bottom-nav__item--active')
  })

  it('marks Buscar active on "/search"', () => {
    __mockRoute.path = '/search'
    const wrapper = mount(PwaBottomNav, { global: { stubs } })
    const items = wrapper.findAll('.pwa-bottom-nav__item')
    expect(items[1]?.classes()).toContain('pwa-bottom-nav__item--active')
    expect(items[0]?.classes()).not.toContain('pwa-bottom-nav__item--active')
  })

  it('no tab is active on an unrelated route', () => {
    __mockRoute.path = '/activity/abc-123'
    const wrapper = mount(PwaBottomNav, { global: { stubs } })
    const items = wrapper.findAll('.pwa-bottom-nav__item')
    items.forEach((item) => expect(item.classes()).not.toContain('pwa-bottom-nav__item--active'))
  })

  it('opens categories sheet and loads categories on tap', async () => {
    const wrapper = mount(PwaBottomNav, { global: { stubs } })
    await wrapper.findAll('.pwa-bottom-nav__item')[2]?.trigger('click')
    expect(mockGetNavCategoriesWithChildren).toHaveBeenCalledTimes(1)
    const drawer = wrapper.findComponent(stubs.UiDrawer)
    expect(drawer.props('open')).toBe(true)
  })

  it('opens the suggest-activity wizard on tap', async () => {
    const wrapper = mount(PwaBottomNav, { global: { stubs } })
    await wrapper.findAll('.pwa-bottom-nav__item')[3]?.trigger('click')
    const wizard = wrapper.findComponent(stubs.SuggestionsSuggestionWizard)
    expect(wizard.props('open')).toBe(true)
  })

  it('opens contact directly on tap (no intermediate sheet)', async () => {
    const wrapper = mount(PwaBottomNav, { global: { stubs } })
    await wrapper.findAll('.pwa-bottom-nav__item')[4]?.trigger('click')
    expect(mockOpenContact).toHaveBeenCalled()
  })
})

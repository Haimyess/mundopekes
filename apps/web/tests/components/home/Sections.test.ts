import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref, Suspense } from 'vue'
import { makeResultItem } from '../search/fixtures'

const { mockLocate, mockFetch } = vi.hoisted(() => ({ mockLocate: vi.fn(), mockFetch: vi.fn() }))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: { value: 'en' },
    t: (key: string, params?: unknown) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
  }),
}))
vi.mock('~/app/composables/useI18nContent', () => ({
  useI18nContent: () => ({ tc: (text: Record<string, string>) => text.es ?? '' }),
}))
vi.mock('~/app/composables/useCurrentPosition', () => ({
  useCurrentPosition: () => ({ isLocating: ref(false), error: ref(null), locate: mockLocate }),
}))
vi.mock('~/app/composables/useCategories', () => ({
  useCategories: () => ({ getNavCategoriesWithChildren: vi.fn() }),
}))
vi.mock('../../../node_modules/nuxt/dist/app/composables/asyncData.js', () => ({
  useAsyncData: async () => ({
    data: ref([
      {
        id: '1',
        slug: 'aire-libre',
        icon: 'i-lucide-tree-pine',
        name_i18n: { es: 'Aire libre' },
        children: [],
      },
      { id: '2', slug: 'aventura', icon: null, name_i18n: { es: 'Aventura' }, children: [] },
    ]),
  }),
}))
vi.mock('../../../node_modules/nuxt/dist/app/composables/router.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRouter: () => ({
    resolve: (location: { path: string; query: Record<string, string> }) => ({
      fullPath: `${location.path}?${new URLSearchParams(location.query).toString()}`,
    }),
  }),
}))
vi.mock('~/app/components/suggestions/SuggestionWizard.vue', async () => {
  const { defineComponent: define, h: render } = await import('vue')
  return {
    default: define({
      name: 'SuggestionsSuggestionWizard',
      props: { open: Boolean },
      setup: (props) => () => render('div', { 'data-open': String(props.open) }),
    }),
  }
})
vi.stubGlobal('$fetch', mockFetch)

const CarouselSection = (await import('~/app/components/home/CarouselSection.vue')).default
const CategoryGrid = (await import('~/app/components/home/CategoryGrid.vue')).default
const Nearby = (await import('~/app/components/home/Nearby.vue')).default
const Ctas = (await import('~/app/components/home/Ctas.vue')).default

const SectionHeaderStub = defineComponent({
  name: 'UiSectionHeader',
  props: {
    title: { type: String, required: true },
    actionLabel: { type: String, default: '' },
    actionTo: { type: String, default: '' },
  },
  setup: (props) => () =>
    h('header', [h('h2', props.title), h('a', { href: props.actionTo }, props.actionLabel)]),
})
const CarouselStub = defineComponent({
  name: 'UiCarousel',
  props: { items: { type: Array, required: true }, label: { type: String, required: true } },
  setup:
    (props, { slots }) =>
    () =>
      h(
        'ul',
        { 'aria-label': props.label },
        (props.items as unknown[]).map((item) => h('li', slots.item?.({ item })))
      ),
})
const CardStub = defineComponent({
  name: 'SearchResultCard',
  props: { item: { type: Object, required: true } },
  setup: (props) => () => h('article', { 'data-id': (props.item as { id: string }).id }),
})
const NuxtLinkStub = defineComponent({
  name: 'NuxtLink',
  props: { to: { type: String, required: true } },
  setup:
    (props, { slots }) =>
    () =>
      h('a', { href: props.to }, slots.default?.()),
})
const STUBS = {
  UiSectionHeader: SectionHeaderStub,
  UiCarousel: CarouselStub,
  SearchResultCard: CardStub,
  NuxtLink: NuxtLinkStub,
  UiIcon: true,
}

describe('HomeCarouselSection', () => {
  it('lists the cards and links to every result', () => {
    const wrapper = mount(CarouselSection, {
      props: {
        title: 'Este Shabat',
        section: {
          items: [makeResultItem({ id: 'a' }), makeResultItem({ id: 'b' })],
          total: 9,
          query: { when: 'shabat' },
        },
      },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('ul').attributes('aria-label')).toBe('Este Shabat')
    expect(wrapper.findAll('article').map((card) => card.attributes('data-id'))).toEqual(['a', 'b'])
    const seeAll = wrapper.find('header a')
    expect(seeAll.attributes('href')).toBe('/search?when=shabat')
    expect(seeAll.text()).toBe('home.seeAll:{"count":9}')
  })
})

describe('HomeCategoryGrid', () => {
  it('links every category with its icon and plan count', async () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(Suspense, null, { default: () => h(CategoryGrid, { counts: { 'aire-libre': 14 } }) }),
      }),
      { global: { stubs: STUBS } }
    )
    await flushPromises()
    const tiles = wrapper.findAll('.category-grid__tile')
    expect(
      tiles.map((tile) => [tile.attributes('href'), tile.find('.category-grid__name').text()])
    ).toEqual([
      ['/search?category=aire-libre', 'Aire libre'],
      ['/search?category=aventura', 'Aventura'],
    ])
    expect(tiles.map((tile) => tile.find('.category-grid__count').text())).toEqual([
      'results.count:14',
      'results.count:0',
    ])
  })
})

describe('HomeNearby', () => {
  beforeEach(() => {
    mockLocate.mockReset()
    mockFetch.mockReset()
  })

  const mountNearby = () =>
    mount(Nearby, {
      global: {
        stubs: {
          ...STUBS,
          UiButton: defineComponent({
            emits: ['click'],
            setup:
              (_, { emit, slots }) =>
              () =>
                h('button', { onClick: () => emit('click') }, slots.default?.()),
          }),
          ClientOnly: true,
          HomeCarouselSection: defineComponent({
            props: { section: { type: Object, required: true } },
            setup: (props) => () =>
              h('div', {
                class: 'section',
                'data-total': (props.section as { total: number }).total,
              }),
          }),
        },
      },
    })

  it('only asks for the location when the button is pressed', async () => {
    mountNearby()
    expect(mockLocate).not.toHaveBeenCalled()
  })

  it('loads the nearest plans around a rounded point', async () => {
    mockLocate.mockResolvedValue({ lat: 32.43651, lng: 34.91962 })
    mockFetch.mockResolvedValue({
      items: [makeResultItem()],
      total: 3,
      pins: [{ ...makeResultItem(), location: { lat: 32.4, lng: 34.9 } }],
    })
    const wrapper = mountNearby()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(mockFetch).toHaveBeenCalledWith('/api/search', {
      query: { where: 'point:32.44,34.92', sort: 'distance' },
    })
    expect(wrapper.find('.section').attributes('data-total')).toBe('3')
  })

  it('shows an error when the results cannot be loaded', async () => {
    mockLocate.mockResolvedValue({ lat: 32.4, lng: 34.9 })
    mockFetch.mockRejectedValue(new Error('offline'))
    const wrapper = mountNearby()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toBe('errors.generic.description')
  })
})

describe('HomeCtas', () => {
  it('opens the quick suggestion sheet from its trigger', async () => {
    const QuickSheetStub = defineComponent({
      name: 'SuggestionsQuickSheet',
      props: { open: Boolean, origin: { type: String, required: true } },
      emits: ['update:open'],
      setup:
        (props, { emit, slots }) =>
        () =>
          h(
            'div',
            {
              'data-open': String(props.open),
              'data-origin': props.origin,
              onClick: () => emit('update:open', true),
            },
            slots.trigger?.()
          ),
    })
    const wrapper = mount(Ctas, {
      global: { stubs: { ...STUBS, SuggestionsQuickSheet: QuickSheetStub } },
    })
    const sheet = wrapper.get('[data-open]')
    expect(sheet.attributes('data-origin')).toBe('home')
    expect(sheet.attributes('data-open')).toBe('false')
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('[data-open]').attributes('data-open')).toBe('true')
  })

  it('invites businesses to the business page', () => {
    const wrapper = mount(Ctas, { global: { stubs: { ...STUBS, SuggestionsQuickSheet: true } } })
    const link = wrapper.findAll('a').find((anchor) => anchor.attributes('href') === '/business')
    expect(link?.text()).toBe('business.cta.homeAction')
    expect(wrapper.findAll('h2').map((heading) => heading.text())).toEqual([
      'home.ctas.suggestTitle',
      'business.cta.homeTitle',
    ])
  })
})

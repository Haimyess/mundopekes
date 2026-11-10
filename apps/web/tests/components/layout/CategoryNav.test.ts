import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h, ref, Suspense } from 'vue'

const isSearchPage = ref(true)
const searchState = ref<Record<string, unknown>>({})
const facets = ref<{ total: number; categories: Record<string, number> } | null>(null)
const searchResults = computed(() => (facets.value ? { facets: facets.value } : null))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/app/composables/useI18nContent', () => ({
  useI18nContent: () => ({ tc: (text: Record<string, string>) => text.es ?? '' }),
}))
vi.mock('~/app/composables/useCategories', () => ({
  useCategories: () => ({ getNavCategoriesWithChildren: vi.fn() }),
}))
vi.mock('../../../node_modules/nuxt/dist/app/composables/asyncData.js', () => ({
  useNuxtData: () => ({ data: searchResults }),
  useAsyncData: async () => ({
    data: ref([
      { id: '1', slug: 'aire-libre', name_i18n: { es: 'Aire libre' }, children: [] },
      { id: '2', slug: 'aventura', name_i18n: { es: 'Aventura' }, children: [] },
    ]),
  }),
}))
vi.mock('~/app/composables/useSearchState', () => ({
  useSearchState: () => ({
    state: computed(() => searchState.value),
    isSearchPage: computed(() => isSearchPage.value),
    linkTo: (patch: Record<string, unknown>) => {
      const merged = { ...searchState.value, ...patch }
      const query = Object.entries(merged)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join('&')
      return query ? `/search?${query}` : '/search'
    },
  }),
}))

const UiChipStub = defineComponent({
  name: 'UiChip',
  props: {
    to: { type: String, required: true },
    selected: Boolean,
    count: { type: Number, default: undefined },
  },
  setup(props, { slots }) {
    return () =>
      h(
        'a',
        {
          href: props.to,
          'data-selected': String(props.selected),
          'data-count': props.count ?? '',
        },
        slots.default?.()
      )
  },
})

const CategoryNav = (await import('~/app/components/Layout/CategoryNav.vue')).default

async function mountNav() {
  const wrapper = mount(
    defineComponent({ render: () => h(Suspense, null, { default: () => h(CategoryNav) }) }),
    { global: { stubs: { UiChip: UiChipStub } } }
  )
  await flushPromises()
  return wrapper.findAll('a').map((link) => ({
    text: link.text(),
    href: link.attributes('href'),
    selected: link.attributes('data-selected'),
    count: link.attributes('data-count'),
  }))
}

describe('LayoutCategoryNav', () => {
  it('shows counts on the search page and keeps the other filters in the links', async () => {
    isSearchPage.value = true
    searchState.value = { category: 'aire-libre', when: 'today' }
    facets.value = { total: 9, categories: { 'aire-libre': 6 } }
    expect(await mountNav()).toEqual([
      { text: 'layout.allCategories', href: '/search?when=today', selected: 'false', count: '9' },
      { text: 'Aire libre', href: '/search?when=today', selected: 'true', count: '6' },
      {
        text: 'Aventura',
        href: '/search?category=aventura&when=today',
        selected: 'false',
        count: '0',
      },
      {
        text: 'layout.free',
        href: '/search?category=aire-libre&when=today&free=true',
        selected: 'false',
        count: '',
      },
    ])
  })

  it('shows plain links without counts outside the search page', async () => {
    isSearchPage.value = false
    searchState.value = {}
    facets.value = { total: 9, categories: {} }
    const chips = await mountNav()
    expect(chips.map(({ href }) => href)).toEqual([
      '/search',
      '/search?category=aire-libre',
      '/search?category=aventura',
      '/search?free=true',
    ])
    expect(chips.every(({ count, selected }) => count === '' && selected === 'false')).toBe(true)
  })

  it('toggles the free filter off when it is active', async () => {
    isSearchPage.value = true
    searchState.value = { free: true }
    const free = (await mountNav()).at(-1)
    expect(free).toMatchObject({ selected: 'true', href: '/search' })
  })
})

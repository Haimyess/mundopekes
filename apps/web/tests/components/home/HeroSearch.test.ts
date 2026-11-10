import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('../../../node_modules/nuxt/dist/app/composables/router.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  navigateTo: mockNavigate,
  useRoute: () => ({ path: '/', query: {} }),
  useRouter: () => ({
    resolve: (location: { path: string; query: Record<string, string> }) => ({
      fullPath: `${location.path}?${new URLSearchParams(location.query).toString()}`,
    }),
  }),
}))

const { useSearchSheet } = await import('~/app/composables/useSearchSheet')
const HeroSearch = (await import('~/app/components/home/HeroSearch.vue')).default

const DraftEditingSheet = defineComponent({
  name: 'SearchWhoSheet',
  setup() {
    const isOpen = ref(true)
    const { apply } = useSearchSheet(isOpen, (state) => state.ages)
    const handleClick = () => apply({ ages: [5] })
    return () => h('button', { class: 'pick-ages', type: 'button', onClick: handleClick })
  },
})

const UiChipStub = defineComponent({
  name: 'UiChip',
  props: { to: { type: String, required: true } },
  setup:
    (props, { slots }) =>
    () =>
      h('a', { href: props.to }, slots.default?.()),
})

const mountHero = () =>
  mount(HeroSearch, {
    props: { occasion: null },
    global: {
      stubs: {
        SearchWhereSheet: true,
        SearchWhenSheet: true,
        SearchWhoSheet: DraftEditingSheet,
        UiButton: true,
        UiChip: UiChipStub,
      },
    },
  })

describe('HomeHeroSearch', () => {
  beforeEach(() => mockNavigate.mockReset())

  it('renders the page heading, a search landmark and crawlable quick filters', () => {
    const wrapper = mountHero()
    expect(wrapper.find('h1').text()).toBe('home.title')
    expect(wrapper.find('form').attributes('role')).toBe('search')
    expect(wrapper.findAll('.hero-search__chips a').map((link) => link.attributes('href'))).toEqual(
      [
        '/search?category=indoor-juego',
        '/search?category=agua-playas',
        '/search?free=true',
        '/search?category=aire-libre',
        '/search?open=now',
        '/search?ages=0',
      ]
    )
  })

  it('keeps sheet choices in a draft and searches with them on submit', async () => {
    const wrapper = mountHero()
    await wrapper.find('.pick-ages').trigger('click')
    expect(mockNavigate).not.toHaveBeenCalled()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockNavigate).toHaveBeenCalledWith('/search?ages=5')
  })
})

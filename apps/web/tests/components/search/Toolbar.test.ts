import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { NuxtLinkStub } from '../ui/stubs'
import QueryLink from '~/app/components/search/QueryLink.vue'
import { searchState } from './search-state-mock'

const isToolbarVisible = ref(true)
const hasCookieChoice = ref(true)

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ locale: { value: 'en' }, t: (key: string) => key }),
}))
vi.mock('~/app/composables/useI18nContent', () => ({
  useI18nContent: () => ({ tc: (text: Record<string, string>) => text.es ?? '' }),
}))
vi.mock(
  '~/app/composables/useSearchState',
  async () => (await import('./search-state-mock')).searchStateModule
)
vi.mock('~/app/composables/useCookieConsent', () => ({
  useCookieConsent: () => ({ hasDecided: hasCookieChoice }),
}))
vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useElementVisibility: () => isToolbarVisible,
}))

const FiltersSheetStub = defineComponent({
  name: 'SearchFiltersSheet',
  props: { open: Boolean },
  setup(props) {
    return () => h('div', { 'data-stub': 'SearchFiltersSheet', 'data-open': String(props.open) })
  },
})
const sheetStub = (name: string) =>
  defineComponent({ name, setup: () => () => h('div', { 'data-stub': name }) })

const Toolbar = (await import('~/app/components/search/Toolbar.vue')).default

const mountToolbar = () =>
  mount(Toolbar, {
    props: { occasion: null },
    global: {
      stubs: {
        SearchWhereSheet: sheetStub('SearchWhereSheet'),
        SearchWhenSheet: sheetStub('SearchWhenSheet'),
        SearchWhoSheet: sheetStub('SearchWhoSheet'),
        SearchFiltersSheet: FiltersSheetStub,
        SearchSortSheet: sheetStub('SearchSortSheet'),
        UiIcon: true,
        NuxtLink: NuxtLinkStub,
      },
      components: { SearchQueryLink: QueryLink },
    },
  })

describe('SearchToolbar', () => {
  beforeEach(() => {
    isToolbarVisible.value = true
    hasCookieChoice.value = true
    searchState.value = {}
  })

  it('groups the search sheets under a label', () => {
    const group = mountToolbar().find('[role="group"]')
    expect(group.attributes('aria-label')).toBe('results.toolbar.label')
    expect(group.findAll('[data-stub]').map((sheet) => sheet.attributes('data-stub'))).toEqual([
      'SearchWhereSheet',
      'SearchWhenSheet',
      'SearchWhoSheet',
      'SearchFiltersSheet',
      'SearchSortSheet',
    ])
  })

  it('toggles between the list and the map keeping the filters', () => {
    searchState.value = { free: true }
    expect(mountToolbar().find('.search-toolbar__view').attributes('href')).toBe(
      '/search?free=true&view=map'
    )
    searchState.value = { free: true, view: 'map' }
    const toggle = mountToolbar().find('.search-toolbar__view')
    expect(toggle.attributes('href')).toBe('/search?free=true')
    expect(toggle.text()).toBe('results.toolbar.list')
  })

  it('shows the floating filters button only when the toolbar scrolls away', async () => {
    const wrapper = mountToolbar()
    await flushPromises()
    expect(wrapper.find('.search-toolbar__floating').exists()).toBe(false)
    isToolbarVisible.value = false
    await flushPromises()
    expect(wrapper.find('.search-toolbar__floating').exists()).toBe(true)
  })

  it('keeps the floating button away while the cookie banner is open', async () => {
    hasCookieChoice.value = false
    isToolbarVisible.value = false
    const wrapper = mountToolbar()
    await flushPromises()
    expect(wrapper.find('.search-toolbar__floating').exists()).toBe(false)
  })

  it('opens the filters sheet from the floating button and shows the active count', async () => {
    searchState.value = { free: true, open: 'now' }
    isToolbarVisible.value = false
    const wrapper = mountToolbar()
    await flushPromises()
    expect(wrapper.find('.search-toolbar__floating-count').text()).toBe('2')
    await wrapper.find('.search-toolbar__floating').trigger('click')
    expect(wrapper.find('[data-stub="SearchFiltersSheet"]').attributes('data-open')).toBe('true')
    expect(wrapper.find('.search-toolbar__floating').exists()).toBe(false)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { SHEET_STUBS } from './sheet-harness'
import { searchState } from './search-state-mock'

const { mockNavigate, mockFetch } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockFetch: vi.fn(),
}))

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
vi.mock(
  '~/app/composables/useSearchState',
  async () => (await import('./search-state-mock')).searchStateModule
)
vi.mock('../../../node_modules/nuxt/dist/app/composables/router.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  navigateTo: mockNavigate,
}))
vi.stubGlobal('$fetch', mockFetch)

const SheetTrigger = (await import('~/app/components/search/SheetTrigger.vue')).default
const SheetFooter = (await import('~/app/components/search/SheetFooter.vue')).default
const SHARED_COMPONENTS = { SearchSheetTrigger: SheetTrigger, SearchSheetFooter: SheetFooter }

function button(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('button').find((element) => element.text().startsWith(label))!
}

const FiltersSheet = (await import('~/app/components/search/FiltersSheet.vue')).default

const PREVIEW = {
  total: 7,
  facets: {
    total: 9,
    categories: {},
    kinds: { activity: 5, place: 2 },
    amenities: { stroller: 4, wheelchair: 3, bathrooms: 0, shade: 1 },
  },
}

async function openSheet() {
  const wrapper = mount(FiltersSheet, {
    global: { stubs: SHEET_STUBS, components: SHARED_COMPONENTS },
  })
  await wrapper.find('.trigger').trigger('click')
  await new Promise((resolve) => setTimeout(resolve, 300))
  await flushPromises()
  return wrapper
}

const switchFor = (wrapper: ReturnType<typeof mount>, label: string) =>
  wrapper.findAll('[data-stub="UiSwitch"]').find((element) => element.text() === label)!

describe('SearchFiltersSheet', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockFetch.mockReset().mockResolvedValue(PREVIEW)
    searchState.value = { category: 'parques', page: 3 }
  })

  it('counts the active filters in the trigger', () => {
    searchState.value = { free: true, amenities: ['stroller', 'shade'] }
    const wrapper = mount(FiltersSheet, {
      global: { stubs: SHEET_STUBS, components: SHARED_COMPONENTS },
    })
    expect(wrapper.find('.sheet-trigger__count').text()).toBe('3')
  })

  it('previews the result count and facets of the draft', async () => {
    const wrapper = await openSheet()
    expect(mockFetch).toHaveBeenCalledWith('/api/search', { query: { category: 'parques' } })
    expect(button(wrapper, 'results.filters.show').text()).toBe('results.filters.show:7')
    expect(
      wrapper.findAll('[data-stub="UiChip"]').map((chip) => chip.attributes('data-count'))
    ).toEqual(['', '5', '2'])
    expect(
      switchFor(wrapper, 'results.filters.amenities.wheelchair').attributes('data-description')
    ).toBe('results.filters.matches:3')
  })

  it('applies kind, price, amenities and opening hours together', async () => {
    const wrapper = await openSheet()
    await wrapper.findAll('[data-stub="UiChip"]')[2]!.trigger('click')
    await switchFor(wrapper, 'results.filters.freeOnly').find('input').setValue(true)
    await switchFor(wrapper, 'results.filters.amenities.shade').find('input').setValue(true)
    await switchFor(wrapper, 'results.filters.amenities.stroller').find('input').setValue(true)
    await switchFor(wrapper, 'results.filters.openNow').find('input').setValue(true)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(mockFetch).toHaveBeenLastCalledWith('/api/search', {
      query: {
        category: 'parques',
        free: 'true',
        kind: 'place',
        amenities: 'stroller,shade',
        open: 'now',
      },
    })
    await button(wrapper, 'results.filters.show').trigger('click')
    expect(mockNavigate).toHaveBeenCalledWith(
      '/search?category=parques&free=true&kind=place&amenities=stroller,shade&open=now'
    )
  })

  it('clears the filters in the draft only', async () => {
    searchState.value = { free: true, kind: 'activity' }
    const wrapper = await openSheet()
    await button(wrapper, 'results.actions.clear').trigger('click')
    expect(mockNavigate).not.toHaveBeenCalled()
    await button(wrapper, 'results.filters.show').trigger('click')
    expect(mockNavigate).toHaveBeenCalledWith('/search')
  })

  it('falls back to a plain apply label when the preview fails', async () => {
    mockFetch.mockReset().mockRejectedValue(new Error('offline'))
    const wrapper = await openSheet()
    expect(button(wrapper, 'results.actions.apply').exists()).toBe(true)
  })
})

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

const SortSheet = (await import('~/app/components/search/SortSheet.vue')).default

async function openSheet() {
  const wrapper = mount(SortSheet, {
    global: { stubs: SHEET_STUBS, components: SHARED_COMPONENTS },
  })
  await wrapper.find('.trigger').trigger('click')
  return wrapper
}

describe('SearchSortSheet', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    searchState.value = { category: 'parques' }
  })

  it('offers every sort as one radio group with the default checked', async () => {
    const wrapper = await openSheet()
    const radios = wrapper.findAll('input[type="radio"]')
    expect(radios.map((radio) => radio.attributes('value'))).toEqual([
      'recommended',
      'newest',
      'price',
    ])
    expect(new Set(radios.map((radio) => radio.attributes('name'))).size).toBe(1)
    expect((radios[0]!.element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.find('.sort-sheet__label').text()).toBe('results.sort.recommended')
  })

  it('offers the distance sort only when there is a place to measure from', async () => {
    searchState.value = { where: { kind: 'city', slug: 'haifa' } }
    const wrapper = await openSheet()
    expect(
      wrapper.findAll('input[type="radio"]').map((radio) => radio.attributes('value'))
    ).toEqual(['recommended', 'distance', 'newest', 'price'])
  })

  it('names the default sort after the ages when there are children', async () => {
    searchState.value = { ages: [4] }
    const wrapper = await openSheet()
    expect(wrapper.find('.sort-sheet__label').text()).toBe('results.sort.ageFit')
  })

  it('applies the chosen sort and shows it in the trigger', async () => {
    const wrapper = await openSheet()
    await wrapper.find('input[value="price"]').setValue(true)
    await button(wrapper, 'results.actions.apply').trigger('click')
    expect(mockNavigate).toHaveBeenCalledWith('/search?category=parques&sort=price')
    searchState.value = { sort: 'price' }
    await flushPromises()
    expect(wrapper.find('.sheet-trigger__value').text()).toBe('results.sort.price')
  })

  it('removes the sort from the URL when going back to the default', async () => {
    searchState.value = { sort: 'newest' }
    const wrapper = await openSheet()
    await button(wrapper, 'results.actions.clear').trigger('click')
    await button(wrapper, 'results.actions.apply').trigger('click')
    expect(mockNavigate).toHaveBeenCalledWith('/search')
  })
})

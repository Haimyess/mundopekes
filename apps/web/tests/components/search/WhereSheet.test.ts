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

const { mockLocate, positionError } = vi.hoisted(() => ({
  mockLocate: vi.fn(),
  positionError: { value: null as string | null },
}))

vi.mock('~/app/composables/useCurrentPosition', async () => {
  const { ref } = await import('vue')
  const error = ref<string | null>(null)
  Object.defineProperty(positionError, 'value', {
    get: () => error.value,
    set: (value: string | null) => {
      error.value = value
    },
  })
  return { useCurrentPosition: () => ({ isLocating: ref(false), error, locate: mockLocate }) }
})

const WhereSheet = (await import('~/app/components/search/WhereSheet.vue')).default

async function openSheet() {
  const wrapper = mount(WhereSheet, {
    global: { stubs: SHEET_STUBS, components: SHARED_COMPONENTS },
  })
  await wrapper.find('.trigger').trigger('click')
  return wrapper
}

describe('SearchWhereSheet', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockLocate.mockReset()
    positionError.value = null
    searchState.value = { category: 'parques' }
  })

  it('names the chosen city in the trigger', async () => {
    searchState.value = { where: { kind: 'city', slug: 'haifa' } }
    const wrapper = await openSheet()
    expect(wrapper.find('.sheet-trigger__value').text()).toBe('Haifa')
  })

  it('lists the curated cities as one radio group sorted by name', async () => {
    const wrapper = await openSheet()
    const radios = wrapper.findAll('input[type="radio"]')
    expect(radios.length).toBeGreaterThan(15)
    expect(new Set(radios.map((radio) => radio.attributes('name'))).size).toBe(1)
    const labels = wrapper.findAll('.where-sheet__label').map((label) => label.text())
    expect(labels).toEqual([...labels].sort((first, second) => first.localeCompare(second, 'en')))
  })

  it('applies a city with a custom radius', async () => {
    const wrapper = await openSheet()
    await wrapper.find('input[value="eilat"]').setValue(true)
    await wrapper.findAll('[data-stub="UiChip"]')[1]!.trigger('click')
    await button(wrapper, 'results.actions.done').trigger('click')
    await flushPromises()
    expect(mockNavigate).toHaveBeenCalledWith('/search?category=parques&where=city:eilat&radius=10')
  })

  it('uses the device position rounded to about a kilometre', async () => {
    mockLocate.mockResolvedValue({ lat: 32.08539, lng: 34.78181 })
    const wrapper = await openSheet()
    await button(wrapper, 'results.where.useLocation').trigger('click')
    await flushPromises()
    await button(wrapper, 'results.actions.done').trigger('click')
    expect(mockNavigate).toHaveBeenCalledWith('/search?category=parques&where=point:32.09,34.78')
  })

  it('explains a denied permission', async () => {
    mockLocate.mockImplementation(async () => {
      positionError.value = 'denied'
      return null
    })
    const wrapper = await openSheet()
    await button(wrapper, 'results.where.useLocation').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toBe('results.where.errors.denied')
  })

  it('drops an orphan distance sort when the place is cleared', async () => {
    searchState.value = { where: { kind: 'city', slug: 'haifa' }, sort: 'distance' }
    const wrapper = await openSheet()
    await button(wrapper, 'results.actions.clear').trigger('click')
    await button(wrapper, 'results.actions.done').trigger('click')
    expect(mockNavigate).toHaveBeenCalledWith('/search')
  })
})

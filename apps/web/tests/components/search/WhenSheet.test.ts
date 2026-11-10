import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { SHEET_STUBS } from './sheet-harness'
import { searchState } from './search-state-mock'

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))

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

const UiCalendarStub = defineComponent({
  name: 'UiCalendar',
  props: { modelValue: { type: String, default: null }, label: { type: String, required: true } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        'data-stub': 'UiCalendar',
        value: props.modelValue ?? '',
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).value),
      })
  },
})

const SheetTrigger = (await import('~/app/components/search/SheetTrigger.vue')).default
const SheetFooter = (await import('~/app/components/search/SheetFooter.vue')).default
const WhenSheet = (await import('~/app/components/search/WhenSheet.vue')).default

const HANUKKAH = {
  key: 'hanukkah',
  name: { es: 'Janucá' },
  startsOn: '2026-12-05',
  endsOn: '2026-12-12',
}

async function openSheet(occasion: typeof HANUKKAH | null = null) {
  const wrapper = mount(WhenSheet, {
    props: { occasion },
    global: {
      stubs: { ...SHEET_STUBS, UiCalendar: UiCalendarStub },
      components: { SearchSheetTrigger: SheetTrigger, SearchSheetFooter: SheetFooter },
    },
  })
  await wrapper.find('.trigger').trigger('click')
  return wrapper
}

const chip = (wrapper: Awaited<ReturnType<typeof openSheet>>, label: string) =>
  wrapper.findAll('[data-stub="UiChip"]').find((element) => element.text() === label)!

const footerButton = (wrapper: Awaited<ReturnType<typeof openSheet>>, label: string) =>
  wrapper.findAll('.footer button').find((element) => element.text() === label)!

describe('SearchWhenSheet', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    searchState.value = { category: 'parques' }
  })

  it('summarizes the current date in the trigger', async () => {
    searchState.value = { when: { kind: 'shortcut', shortcut: 'this-weekend' } }
    const wrapper = await openSheet()
    expect(wrapper.find('.sheet-trigger__value').text()).toBe('results.when.this-weekend')
  })

  it('applies a shortcut keeping the other filters', async () => {
    const wrapper = await openSheet()
    await chip(wrapper, 'results.when.shabat').trigger('click')
    expect(chip(wrapper, 'results.when.shabat').attributes('aria-pressed')).toBe('true')
    await footerButton(wrapper, 'results.actions.done').trigger('click')
    await flushPromises()
    expect(mockNavigate).toHaveBeenCalledWith('/search?category=parques&when=shabat')
  })

  it('offers the upcoming occasion', async () => {
    const wrapper = await openSheet(HANUKKAH)
    await chip(wrapper, 'Janucá').trigger('click')
    await footerButton(wrapper, 'results.actions.done').trigger('click')
    expect(mockNavigate).toHaveBeenCalledWith('/search?category=parques&when=occasion:hanukkah')
  })

  it('turns a calendar day into a fixed date', async () => {
    const wrapper = await openSheet()
    await wrapper.find('[data-stub="UiCalendar"]').setValue('2026-12-01')
    await footerButton(wrapper, 'results.actions.done').trigger('click')
    expect(mockNavigate).toHaveBeenCalledWith('/search?category=parques&when=fixed:2026-12-01')
  })

  it('clears the draft without navigating until confirmed', async () => {
    searchState.value = { when: { kind: 'shortcut', shortcut: 'today' } }
    const wrapper = await openSheet()
    await footerButton(wrapper, 'results.actions.clear').trigger('click')
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(chip(wrapper, 'results.when.today').attributes('aria-pressed')).toBe('false')
    await footerButton(wrapper, 'results.actions.done').trigger('click')
    expect(mockNavigate).toHaveBeenCalledWith('/search')
  })
})

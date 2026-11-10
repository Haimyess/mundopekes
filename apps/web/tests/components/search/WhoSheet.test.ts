import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
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

const UiStepperStub = defineComponent({
  name: 'UiStepper',
  props: {
    modelValue: { type: Number, required: true },
    label: { type: String, required: true },
    valueLabel: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        { 'data-stub': 'UiStepper', 'data-label': props.label, 'data-value': props.valueLabel },
        [
          h(
            'button',
            { class: 'older', onClick: () => emit('update:modelValue', props.modelValue + 1) },
            '+'
          ),
        ]
      )
  },
})

const WhoSheet = (await import('~/app/components/search/WhoSheet.vue')).default

async function openSheet() {
  const wrapper = mount(WhoSheet, {
    global: { stubs: { ...SHEET_STUBS, UiStepper: UiStepperStub }, components: SHARED_COMPONENTS },
  })
  await wrapper.find('.trigger').trigger('click')
  return wrapper
}

describe('SearchWhoSheet', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    searchState.value = { free: true }
  })

  it('summarizes the ages in the trigger and starts with the current children', async () => {
    searchState.value = { ages: [3, 7] }
    const wrapper = await openSheet()
    expect(wrapper.find('.sheet-trigger__value').text()).toBe(
      'results.who.value:{"ages":"3 and 7"}'
    )
    expect(
      wrapper.findAll('[data-stub="UiStepper"]').map((stepper) => stepper.attributes('data-label'))
    ).toEqual(['results.whoSheet.child:{"number":1}', 'results.whoSheet.child:{"number":2}'])
  })

  it('adds, edits and removes children before applying', async () => {
    const wrapper = await openSheet()
    expect(wrapper.find('.who-sheet__empty').exists()).toBe(true)
    await button(wrapper, 'results.whoSheet.add').trigger('click')
    await button(wrapper, 'results.whoSheet.add').trigger('click')
    await wrapper.findAll('.older')[0]!.trigger('click')
    await wrapper.findAll('[aria-label^="results.whoSheet.remove"]')[1]!.trigger('click')
    await button(wrapper, 'results.actions.done').trigger('click')
    await flushPromises()
    expect(mockNavigate).toHaveBeenCalledWith('/search?ages=6&free=true')
  })

  it('stops offering new children at the limit', async () => {
    searchState.value = { ages: [1, 2, 3, 4, 5, 6] }
    const wrapper = await openSheet()
    expect(
      wrapper.findAll('button').some((element) => element.text() === 'results.whoSheet.add')
    ).toBe(false)
  })

  it('clears every child and removes the ages from the URL', async () => {
    searchState.value = { ages: [4] }
    const wrapper = await openSheet()
    await button(wrapper, 'results.actions.clear').trigger('click')
    expect(mockNavigate).not.toHaveBeenCalled()
    await button(wrapper, 'results.actions.done').trigger('click')
    expect(mockNavigate).toHaveBeenCalledWith('/search')
  })
})

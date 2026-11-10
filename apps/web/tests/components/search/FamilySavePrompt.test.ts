import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h } from 'vue'
import { searchState } from './search-state-mock'

const { mockSave, mockShow, savedFamily, dismissed } = vi.hoisted(() => ({
  mockSave: vi.fn(),
  mockShow: vi.fn(),
  savedFamily: { value: null as Record<string, unknown> | null },
  dismissed: { value: false },
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock(
  '~/app/composables/useSearchState',
  async () => (await import('./search-state-mock')).searchStateModule
)
vi.mock('~/app/composables/useFamily', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useFamily: () => ({
    family: computed(() => savedFamily.value),
    save: mockSave,
    isSaved: () => false,
  }),
}))
vi.mock('../../../../../layers/ui/composables/useUiToast', () => ({
  useUiToast: () => ({ show: mockShow }),
}))
vi.mock('@vueuse/core', async (importOriginal) => {
  const { ref: createRef } = await import('vue')
  const dismissedRef = createRef(false)
  Object.defineProperty(dismissed, 'value', {
    get: () => dismissedRef.value,
    set: (value: boolean) => {
      dismissedRef.value = value
    },
  })
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useMounted: () => createRef(true),
    useSessionStorage: () => dismissedRef,
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  emits: ['click'],
  setup:
    (_, { emit, slots }) =>
    () =>
      h('button', { onClick: () => emit('click') }, slots.default?.()),
})

const Prompt = (await import('~/app/components/search/FamilySavePrompt.vue')).default

const mountPrompt = () => mount(Prompt, { global: { stubs: { UiButton: UiButtonStub } } })

describe('SearchFamilySavePrompt', () => {
  beforeEach(() => {
    mockSave.mockReset()
    mockShow.mockReset()
    savedFamily.value = null
    dismissed.value = false
    searchState.value = { ages: [3, 7] }
  })

  it('offers to save a search with family criteria', () => {
    const wrapper = mountPrompt()
    expect(wrapper.find('h2').text()).toBe('family.prompt.title')
    expect(wrapper.find('section').attributes('aria-labelledby')).toBe(
      wrapper.find('h2').attributes('id')
    )
  })

  it('offers to update when another search is already saved', () => {
    savedFamily.value = { ages: [2] }
    expect(mountPrompt().find('h2').text()).toBe('family.prompt.updateTitle')
  })

  it('stays hidden without family criteria', () => {
    searchState.value = { category: 'parques' }
    expect(mountPrompt().find('section').exists()).toBe(false)
  })

  it('saves the current search and confirms it', async () => {
    const wrapper = mountPrompt()
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(mockSave).toHaveBeenCalledWith({ ages: [3, 7] })
    expect(mockShow).toHaveBeenCalledWith({ title: 'family.saved', tone: 'success' })
  })

  it('hides for the rest of the session when dismissed', async () => {
    const wrapper = mountPrompt()
    await wrapper.findAll('button')[1]!.trigger('click')
    await flushPromises()
    expect(wrapper.find('section').exists()).toBe(false)
    expect(dismissed.value).toBe(true)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed, defineComponent, h, ref } from 'vue'

const { mockSwitchLocale, currentLocale } = vi.hoisted(() => ({
  mockSwitchLocale: vi.fn(),
  currentLocale: { value: 'he' },
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/app/composables/useLanguageSwitch', () => ({
  useLanguageSwitch: () => ({
    locales: [
      { code: 'es', name: 'Español' },
      { code: 'he', name: 'עברית' },
    ],
    currentLocale: computed(() => currentLocale.value),
    switchLocale: mockSwitchLocale,
  }),
}))

const sheetOpen = ref<boolean | undefined>(undefined)
const UiSheetStub = defineComponent({
  name: 'UiSheet',
  props: {
    open: Boolean,
    title: { type: String, required: true },
    closeLabel: { type: String, required: true },
  },
  emits: ['update:open'],
  setup(props, { slots }) {
    return () => {
      sheetOpen.value = props.open
      return h('div', { 'data-title': props.title, 'data-close': props.closeLabel }, [
        slots.trigger?.(),
        slots.default?.(),
      ])
    }
  },
})
const UiIconStub = defineComponent({ name: 'UiIcon', setup: () => () => h('span') })

const LanguageSheet = (await import('~/app/components/Layout/LanguageSheet.vue')).default

const mountSheet = () =>
  mount(LanguageSheet, { global: { stubs: { UiSheet: UiSheetStub, UiIcon: UiIconStub } } })

describe('LayoutLanguageSheet', () => {
  beforeEach(() => {
    mockSwitchLocale.mockReset().mockResolvedValue(undefined)
    currentLocale.value = 'he'
  })

  it('labels the trigger and shows the current language code', () => {
    const trigger = mountSheet().find('.language-sheet__trigger')
    expect(trigger.attributes('aria-label')).toBe('layout.language')
    expect(trigger.attributes('id')).toBeUndefined()
    expect(trigger.text()).toContain('HE')
  })

  it('titles the sheet and labels its close button', () => {
    const sheet = mountSheet().find('[data-title]')
    expect(sheet.attributes('data-title')).toBe('layout.languageTitle')
    expect(sheet.attributes('data-close')).toBe('layout.close')
  })

  it('lists every language in its own language and marks the current one', () => {
    const options = mountSheet().findAll('.language-sheet__option')
    expect(options.map((option) => option.attributes('lang'))).toEqual(['es', 'he'])
    expect(options[1]!.attributes('aria-current')).toBe('true')
    expect(options[0]!.attributes('aria-current')).toBeUndefined()
  })

  it('switches language and closes the sheet', async () => {
    const wrapper = mountSheet()
    await wrapper.findAll('.language-sheet__option')[0]!.trigger('click')
    await flushPromises()
    expect(mockSwitchLocale).toHaveBeenCalledWith('es')
    expect(sheetOpen.value).toBe(false)
  })
})

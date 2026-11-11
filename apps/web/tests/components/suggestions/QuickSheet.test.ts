import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { SHEET_STUBS } from '../search/sheet-harness'

const { mockFetch, mockWidgetReset } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockWidgetReset: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: unknown) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
    locale: { value: 'es' },
  }),
}))
vi.stubGlobal('$fetch', mockFetch)

const FormFieldStub = defineComponent({
  name: 'UiFormField',
  props: {
    label: { type: String, default: '' },
    name: { type: String, default: '' },
    error: { type: String, default: undefined },
    hint: { type: String, default: '' },
    isRequired: Boolean,
  },
  setup:
    (props, { slots }) =>
    () =>
      h('div', { 'data-field': props.name, 'data-error': props.error ?? '' }, [
        h('label', props.label),
        slots.default?.(),
      ]),
})

const InputStub = defineComponent({
  name: 'UiInput',
  props: { modelValue: String },
  emits: ['update:modelValue', 'blur'],
  setup:
    (props, { emit }) =>
    () =>
      h('input', {
        value: props.modelValue,
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).value),
        onBlur: () => emit('blur'),
      }),
})

const TurnstileStub = defineComponent({
  name: 'SuggestionsTurnstileWidget',
  emits: ['verify', 'expire', 'fail'],
  setup(_, { emit, expose }) {
    expose({ reset: mockWidgetReset })
    return () =>
      h('button', {
        type: 'button',
        'data-turnstile': '',
        onClick: () => emit('verify', 'token-1'),
      })
  },
})

const QuickSheet = (await import('~/app/components/suggestions/QuickSheet.vue')).default

function mountSheet() {
  return mount(QuickSheet, {
    props: { origin: 'home', open: true },
    global: {
      stubs: {
        ...SHEET_STUBS,
        UiFormField: FormFieldStub,
        UiInput: InputStub,
        UiTextarea: InputStub,
        SuggestionsTurnstileWidget: TurnstileStub,
      },
    },
  })
}

async function fillAndVerify(wrapper: ReturnType<typeof mountSheet>) {
  await wrapper.get('[data-field="name"] input').setValue('Granja Los Olivos')
  await wrapper.get('[data-field="where"] input').setValue('Ramat HaSharon')
  await wrapper.get('[data-turnstile]').trigger('click')
}

const submitButton = (wrapper: ReturnType<typeof mountSheet>) =>
  wrapper.get('button[type="submit"]')

describe('SuggestionsQuickSheet', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockWidgetReset.mockReset()
  })

  it('renders the four labelled fields and a disabled submit', () => {
    const wrapper = mountSheet()
    expect(wrapper.findAll('[data-field]').map((field) => field.attributes('data-field'))).toEqual([
      'name',
      'where',
      'link',
      'why',
    ])
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('shows the validation error after leaving a required field empty', async () => {
    const wrapper = mountSheet()
    await wrapper.get('[data-field="name"] input').trigger('blur')
    expect(wrapper.get('[data-field="name"]').attributes('data-error')).toMatch(/^validation\./)
    expect(wrapper.get('[data-field="where"]').attributes('data-error')).toBe('')
  })

  it('enables submit only after valid data and verification', async () => {
    const wrapper = mountSheet()
    await fillAndVerify(wrapper)
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('shows the thanks status after a successful submission', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    const wrapper = mountSheet()
    await fillAndVerify(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('quickSuggestion.thanks')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('announces the failure and resets the challenge when sending fails', async () => {
    mockFetch.mockImplementation(() =>
      Promise.reject(Object.assign(new Error('limit'), { statusCode: 429 }))
    )
    const wrapper = mountSheet()
    await fillAndVerify(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('forms.errors.rateLimited')
    expect(mockWidgetReset).toHaveBeenCalledOnce()
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
  })
})

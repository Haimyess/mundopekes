import { defineComponent, h } from 'vue'
import { vi } from 'vitest'

export const widgetReset = vi.fn()

export const FormFieldStub = defineComponent({
  name: 'UiFormField',
  props: {
    label: { type: String, default: '' },
    name: { type: String, default: '' },
    hint: { type: String, default: '' },
    error: { type: String, default: undefined },
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

export const InputStub = defineComponent({
  name: 'UiInput',
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue', 'blur'],
  setup:
    (props, { emit, attrs }) =>
    () =>
      h('input', {
        ...attrs,
        value: props.modelValue,
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).value),
        onBlur: () => emit('blur'),
      }),
})

export const TurnstileStub = defineComponent({
  name: 'SuggestionsTurnstileWidget',
  emits: ['verify', 'expire', 'fail'],
  setup(_, { emit, expose }) {
    expose({ reset: widgetReset })
    return () =>
      h('button', {
        type: 'button',
        'data-turnstile': '',
        onClick: () => emit('verify', 'token-1'),
      })
  },
})

export const RadioGroupStub = defineComponent({
  name: 'UiRadioGroup',
  props: {
    modelValue: { type: String, default: null },
    legend: { type: String, default: '' },
    name: { type: String, default: '' },
    items: { type: Array, default: () => [] },
    error: { type: String, default: undefined },
    isRequired: Boolean,
  },
  emits: ['update:modelValue'],
  setup:
    (props, { emit }) =>
    () =>
      h(
        'fieldset',
        { 'data-radio': props.name, 'data-error': props.error ?? '' },
        (props.items as { value: string; label: string }[]).map((item) =>
          h(
            'button',
            {
              type: 'button',
              role: 'radio',
              'aria-checked': String(props.modelValue === item.value),
              onClick: () => emit('update:modelValue', item.value),
            },
            item.label
          )
        )
      ),
})

export const CheckboxStub = defineComponent({
  name: 'UiCheckbox',
  props: { modelValue: Boolean, label: { type: String, default: '' } },
  emits: ['update:modelValue'],
  setup:
    (props, { emit }) =>
    () =>
      h('input', {
        type: 'checkbox',
        'data-terms': '',
        checked: props.modelValue,
        onChange: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).checked),
      }),
})

export const FORM_STUBS = {
  UiFormField: FormFieldStub,
  UiInput: InputStub,
  UiRadioGroup: RadioGroupStub,
  UiCheckbox: CheckboxStub,
  SuggestionsTurnstileWidget: TurnstileStub,
  NuxtLink: defineComponent({
    props: { to: { type: String, required: true } },
    setup:
      (props, { slots, attrs }) =>
      () =>
        h('a', { ...attrs, href: props.to }, slots.default?.()),
  }),
}

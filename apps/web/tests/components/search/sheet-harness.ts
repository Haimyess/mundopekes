import { defineComponent, h } from 'vue'

export const UiSheetStub = defineComponent({
  name: 'UiSheet',
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, required: true },
    description: { type: String, default: undefined },
  },
  emits: ['update:open'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'section',
        { 'data-stub': 'UiSheet', 'data-open': String(props.open), 'data-title': props.title },
        [
          h(
            'div',
            { class: 'trigger', onClick: () => emit('update:open', true) },
            slots.trigger?.()
          ),
          props.open ? h('div', { class: 'body' }, slots.default?.()) : null,
          props.open ? h('div', { class: 'footer' }, slots.footer?.()) : null,
        ]
      )
  },
})

export const UiChipStub = defineComponent({
  name: 'UiChip',
  props: { selected: Boolean, count: { type: Number, default: undefined } },
  emits: ['toggle'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          'data-stub': 'UiChip',
          'aria-pressed': String(props.selected),
          'data-count': props.count ?? '',
          onClick: () => emit('toggle', !props.selected),
        },
        slots.default?.()
      )
  },
})

export const UiSwitchStub = defineComponent({
  name: 'UiSwitch',
  props: {
    modelValue: Boolean,
    label: { type: String, required: true },
    description: { type: String, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('label', { 'data-stub': 'UiSwitch', 'data-description': props.description ?? '' }, [
        h('input', {
          type: 'checkbox',
          role: 'switch',
          checked: props.modelValue,
          onChange: (event: Event) =>
            emit('update:modelValue', (event.target as HTMLInputElement).checked),
        }),
        props.label,
      ])
  },
})

export const UiButtonStub = defineComponent({
  name: 'UiButton',
  props: { loading: Boolean },
  emits: ['click'],
  setup(props, { slots, emit, attrs }) {
    return () =>
      h(
        'button',
        { ...attrs, 'data-loading': String(props.loading), onClick: () => emit('click') },
        slots.default?.()
      )
  },
})

export const passThrough = (name: string) =>
  defineComponent({
    name,
    setup:
      (_, { slots }) =>
      () =>
        h('span', slots.default?.()),
  })

export const SHEET_STUBS = {
  UiSheet: UiSheetStub,
  UiChip: UiChipStub,
  UiSwitch: UiSwitchStub,
  UiButton: UiButtonStub,
  UiIcon: true,
}

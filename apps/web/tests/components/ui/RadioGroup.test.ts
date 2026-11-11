import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import UiRadioGroup from '../../../../../layers/ui/components/ui/RadioGroup.vue'

let received: Record<string, unknown> = {}

const RadioGroupStub = defineComponent({
  name: 'URadioGroup',
  inheritAttrs: false,
  emits: ['update:modelValue'],
  setup(_, { attrs, emit }) {
    return () => {
      received = { ...attrs }
      return h('button', { type: 'button', onClick: () => emit('update:modelValue', 'manager') })
    }
  },
})

const ITEMS = [
  { label: 'Dueño/a', value: 'owner' },
  { label: 'Gerente', value: 'manager' },
]

const mountGroup = (props: Record<string, unknown> = {}) =>
  mount(UiRadioGroup, {
    props: { legend: 'Tu relación', name: 'role', items: ITEMS, ...props },
    global: { stubs: { URadioGroup: RadioGroupStub } },
  })

describe('UiRadioGroup', () => {
  it('renders a horizontal card group with a legend and the options', () => {
    mountGroup({ isRequired: true })
    expect(received).toMatchObject({
      legend: 'Tu relación',
      name: 'role',
      items: ITEMS,
      required: true,
      orientation: 'horizontal',
      variant: 'card',
      indicator: 'hidden',
    })
  })

  it('links the error message to the group', () => {
    const wrapper = mountGroup({ error: 'Selecciona una opción' })
    expect(received['aria-invalid']).toBe(true)
    expect(received['aria-describedby']).toBe('role-error')
    expect(wrapper.get('#role-error').text()).toBe('Selecciona una opción')
  })

  it('has no error wiring while valid', () => {
    const wrapper = mountGroup()
    expect(received['aria-describedby']).toBeUndefined()
    expect(wrapper.find('#role-error').exists()).toBe(false)
  })

  it('updates the model with the chosen value', async () => {
    const wrapper = mountGroup({ modelValue: null })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['manager']])
  })
})

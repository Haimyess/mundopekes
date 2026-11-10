import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import UiFormField from '../../../../../layers/ui/components/ui/FormField.vue'

let received: Record<string, unknown> = {}

const FormFieldStub = defineComponent({
  name: 'UFormField',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => {
      received = { ...attrs }
      return h('div', { 'data-stub': 'UFormField' }, slots.default?.())
    }
  },
})

const mountField = (props: Record<string, unknown>) =>
  mount(UiFormField, {
    props: { label: 'Nombre', name: 'name', ...props },
    slots: { default: () => h('input', { id: 'field' }) },
    global: { stubs: { UFormField: FormFieldStub } },
  })

describe('UiFormField', () => {
  it('maps label, hint and required state to the form field', () => {
    mountField({ hint: 'Como lo conocés', isRequired: true })
    expect(received).toMatchObject({
      label: 'Nombre',
      name: 'name',
      description: 'Como lo conocés',
      required: true,
      error: false,
    })
  })

  it('forwards the error message so the control is marked invalid', () => {
    mountField({ error: 'Demasiado corto' })
    expect(received.error).toBe('Demasiado corto')
  })

  it('renders the control passed in the slot', () => {
    const wrapper = mountField({})
    expect(wrapper.find('#field').exists()).toBe(true)
  })
})

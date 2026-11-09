import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import UiSwitch from '../../../../../layers/ui/components/ui/Switch.vue'

let received: Record<string, unknown> = {}

const SwitchStub = defineComponent({
  name: 'USwitch',
  inheritAttrs: false,
  emits: ['update:modelValue'],
  setup(_, { attrs, emit }) {
    return () => {
      received = { ...attrs }
      return h('button', {
        role: 'switch',
        onClick: () => emit('update:modelValue', !attrs.modelValue),
      })
    }
  },
})

describe('UiSwitch', () => {
  it('passes the label, description and state to the switch', () => {
    mount(UiSwitch, {
      props: { label: 'Abre ahora', description: 'Solo lugares abiertos', modelValue: true },
      global: { stubs: { USwitch: SwitchStub } },
    })
    expect(received).toMatchObject({
      label: 'Abre ahora',
      description: 'Solo lugares abiertos',
      modelValue: true,
    })
  })

  it('updates the model when toggled', async () => {
    const wrapper = mount(UiSwitch, {
      props: { label: 'Gratis', modelValue: false },
      global: { stubs: { USwitch: SwitchStub } },
    })
    await wrapper.find('[role="switch"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })
})

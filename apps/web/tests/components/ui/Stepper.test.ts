import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { UIconStub } from './stubs'
import UiStepper from '../../../../../layers/ui/components/ui/Stepper.vue'
import UiIcon from '../../../../../layers/ui/components/ui/Icon.vue'

const mountStepper = (props: Record<string, unknown> = {}) =>
  mount(UiStepper, {
    props: {
      label: 'Hijo 1',
      decrementLabel: 'Restar un año',
      incrementLabel: 'Sumar un año',
      modelValue: 3,
      ...props,
    },
    global: { stubs: { UIcon: UIconStub }, components: { UiIcon } },
  })

describe('UiStepper', () => {
  it('is a group labelled by its visible label', () => {
    const wrapper = mountStepper()
    const group = wrapper.find('[role="group"]')
    expect(wrapper.find(`#${group.attributes('aria-labelledby')}`).text()).toBe('Hijo 1')
  })

  it('labels both buttons', () => {
    const labels = mountStepper()
      .findAll('button')
      .map((button) => button.attributes('aria-label'))
    expect(labels).toEqual(['Restar un año', 'Sumar un año'])
  })

  it('announces the value politely', () => {
    const output = mountStepper().find('output')
    expect(output.attributes('aria-live')).toBe('polite')
    expect(output.text()).toBe('3')
  })

  it('steps up and down', async () => {
    const wrapper = mountStepper()
    await wrapper.findAll('button')[1]!.trigger('click')
    await wrapper.setProps({ modelValue: 4 })
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[4], [3]])
  })

  it('stops at the limits', async () => {
    const wrapper = mountStepper({ modelValue: 0, max: 0 })
    const [decrement, increment] = wrapper.findAll('button')
    expect(decrement!.attributes('disabled')).toBeDefined()
    expect(increment!.attributes('disabled')).toBeDefined()
    await increment!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('can show a formatted value', () => {
    expect(mountStepper({ valueLabel: '3 años' }).find('output').text()).toBe('3 años')
  })
})

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { UIconStub } from './stubs'
import UiChip from '../../../../../layers/ui/components/ui/Chip.vue'
import UiIcon from '../../../../../layers/ui/components/ui/Icon.vue'

const mountChip = (props: Record<string, unknown> = {}) =>
  mount(UiChip, {
    props,
    slots: { default: 'Gratis' },
    global: { stubs: { UIcon: UIconStub }, components: { UiIcon } },
  })

describe('UiChip', () => {
  it('exposes the toggle state', () => {
    expect(mountChip({ selected: false }).find('button').attributes('aria-pressed')).toBe('false')
    expect(mountChip({ selected: true }).find('button').attributes('aria-pressed')).toBe('true')
  })

  it('emits the next state when toggled', async () => {
    const wrapper = mountChip({ selected: false })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([[true]])
  })

  it('is a plain action button when it has no toggle state', () => {
    expect(mountChip().find('button').attributes('aria-pressed')).toBeUndefined()
  })

  it('does not toggle when disabled', async () => {
    const wrapper = mountChip({ selected: false, disabled: true })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('toggle')).toBeUndefined()
  })

  it('renders as non-interactive text when static', async () => {
    const wrapper = mountChip({ as: 'span', selected: true })
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('span.ui-chip').attributes('aria-pressed')).toBeUndefined()
    await wrapper.find('span.ui-chip').trigger('click')
    expect(wrapper.emitted('toggle')).toBeUndefined()
  })

  it('keeps counts left-to-right inside right-to-left pages', () => {
    const count = mountChip({ count: 12 }).find('.ui-chip__count')
    expect(count.text()).toBe('12')
    expect(count.attributes('dir')).toBe('ltr')
  })
})

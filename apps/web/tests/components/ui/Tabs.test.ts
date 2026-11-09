import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import UiTabs from '../../../../../layers/ui/components/ui/Tabs.vue'

let received: Record<string, unknown> = {}

const TabsStub = defineComponent({
  name: 'UTabs',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => {
      received = { ...attrs }
      const items = attrs.items as { value: string }[]
      return h('div', [
        h('div', { role: 'tablist' }),
        ...items.map((item) =>
          h('section', { 'data-value': item.value }, slots.content?.({ item }))
        ),
      ])
    }
  },
})

const ITEMS = [
  { label: 'Gratis', value: 'free' },
  { label: 'Último minuto', value: 'last-minute' },
]

const mountTabs = (slots: Record<string, string> = {}) =>
  mount(UiTabs, {
    props: { items: ITEMS, label: 'Ahorra', modelValue: 'free' },
    slots,
    global: { stubs: { UTabs: TabsStub } },
  })

describe('UiTabs', () => {
  it('passes the items and the selected value', () => {
    mountTabs()
    expect(received).toMatchObject({ items: ITEMS, modelValue: 'free', 'value-key': 'value' })
  })

  it('names the tab list and keeps the name in sync', async () => {
    const wrapper = mountTabs()
    expect(wrapper.find('[role="tablist"]').attributes('aria-label')).toBe('Ahorra')
    await wrapper.setProps({ label: 'Descuentos' })
    expect(wrapper.find('[role="tablist"]').attributes('aria-label')).toBe('Descuentos')
  })

  it('renders each panel through the panel slot', () => {
    const wrapper = mountTabs({
      panel: '<template #panel="{ item }">Panel {{ item.value }}</template>',
    })
    expect(wrapper.find('[data-value="last-minute"]').text()).toBe('Panel last-minute')
  })
})

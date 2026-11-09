import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import UiAccordion from '../../../../../layers/ui/components/ui/Accordion.vue'

let received: Record<string, unknown> = {}

const AccordionStub = defineComponent({
  name: 'UAccordion',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => {
      received = { ...attrs }
      const items = attrs.items as { value: string }[]
      return h(
        'div',
        items.map((item) => h('section', { 'data-value': item.value }, slots.body?.({ item })))
      )
    }
  },
})

const ITEMS = [
  { label: 'Ciudades', value: 'cities' },
  { label: 'Ocasiones', value: 'occasions' },
]

const mountAccordion = (props: Record<string, unknown> = {}) =>
  mount(UiAccordion, {
    props: { items: ITEMS, ...props },
    slots: { panel: '<template #panel="{ item }">Enlaces de {{ item.value }}</template>' },
    global: { stubs: { UAccordion: AccordionStub } },
  })

describe('UiAccordion', () => {
  it('allows several sections open by default', () => {
    mountAccordion()
    expect(received.type).toBe('multiple')
  })

  it('can restrict to one open section', () => {
    mountAccordion({ isMultiple: false })
    expect(received.type).toBe('single')
  })

  it('renders each section body through the panel slot', () => {
    expect(mountAccordion().find('[data-value="occasions"]').text()).toBe('Enlaces de occasions')
  })
})

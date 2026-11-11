import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'es' } }),
}))

const passThrough = (name: string, tag = 'div') =>
  defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      const children = () => [slots.body?.(), slots.default?.(), slots.footer?.()]
      return () => h(tag, { ...attrs, 'data-stub': name }, children())
    },
  })

const optionNodes = (items: unknown[]) =>
  (items as { value: string; label: string }[]).map((item) =>
    h('option', { value: item.value }, item.label)
  )

const ModelStub = (name: string, tag: 'select' | 'textarea') =>
  defineComponent({
    name,
    props: { modelValue: { type: String, default: '' }, items: { type: Array, default: () => [] } },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      const handleChange = (event: Event) =>
        emit('update:modelValue', (event.target as HTMLInputElement).value)
      return () =>
        h(
          tag,
          { 'data-stub': name, value: props.modelValue, onChange: handleChange },
          tag === 'select' ? optionNodes(props.items) : undefined
        )
    },
  })

const ButtonStub = defineComponent({
  name: 'UButton',
  props: { to: { type: String, default: undefined }, loading: Boolean, disabled: Boolean },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () => {
      if (props.to) return h('a', { href: props.to }, slots.default?.())
      return h(
        'button',
        { disabled: props.disabled, onClick: () => emit('click') },
        slots.default?.()
      )
    }
  },
})

const Slideover = (await import('~/components/business/BusinessRequestSlideover.vue')).default

const CLAIM = {
  id: 'req-1',
  kind: 'claim',
  status: 'pending',
  place_id: 'place-1',
  business_name: 'Science Museum',
  activity_type: null,
  city: null,
  contact_name: 'Dana Levi',
  role: 'manager',
  email: 'dana@museo.co.il',
  phone: '+972 (3) 123-4567',
  locale: 'he',
  notes: 'Llamar a la tarde',
  accepted_terms_at: '2026-11-11T09:00:00Z',
  created_at: '2026-11-11T09:00:00Z',
  updated_at: '2026-11-11T09:00:00Z',
}

const mountSlideover = (request: Record<string, unknown> | null = CLAIM) =>
  mount(Slideover, {
    props: { request: request as never, isSaving: false, open: true },
    global: {
      stubs: {
        USlideover: passThrough('USlideover'),
        UBadge: passThrough('UBadge', 'span'),
        UFormField: passThrough('UFormField'),
        USelect: ModelStub('USelect', 'select'),
        UTextarea: ModelStub('UTextarea', 'textarea'),
        UButton: ButtonStub,
      },
    },
  })

describe('BusinessRequestSlideover', () => {
  it('shows the claim details with callable phone and email links', () => {
    const wrapper = mountSlideover()
    const text = wrapper.get('dl').text()
    expect(text).toContain('Science Museum')
    expect(text).toContain('businessRequests.roles.manager')
    expect(text).toContain('HE')
    expect(wrapper.get('a[href^="tel:"]').attributes('href')).toBe('tel:+97231234567')
    expect(wrapper.get('a[href^="mailto:"]').attributes('href')).toBe('mailto:dana@museo.co.il')
  })

  it('links to the claimed place', () => {
    expect(mountSlideover().get('a[href="/places/place-1"]').text()).toBe(
      'businessRequests.openPlace'
    )
  })

  it('hides empty fields and the place link for join requests', () => {
    const wrapper = mountSlideover({
      ...CLAIM,
      kind: 'join',
      place_id: null,
      contact_name: null,
      role: null,
      email: null,
      activity_type: 'Taller',
      city: 'Haifa',
    })
    expect(wrapper.find('a[href^="/places/"]').exists()).toBe(false)
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(false)
    expect(wrapper.get('dl').text()).toContain('Haifa')
  })

  it('saves the reviewed status and notes', async () => {
    const wrapper = mountSlideover()
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Llamar a la tarde')
    await wrapper.get('select').setValue('contacted')
    await wrapper.get('textarea').setValue('Confirmado por correo')
    await wrapper.findAll('button').at(-1)!.trigger('click')
    expect(wrapper.emitted('save')).toEqual([['req-1', 'contacted', 'Confirmado por correo']])
  })
})

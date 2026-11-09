import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { CalendarDate } from '@internationalized/date'
import UiCalendar from '../../../../../layers/ui/components/ui/Calendar.vue'

let received: Record<string, unknown> = {}

const CalendarStub = defineComponent({
  name: 'UCalendar',
  inheritAttrs: false,
  emits: ['update:modelValue'],
  setup(_, { attrs, slots, emit }) {
    return () => {
      received = { ...attrs }
      return h('div', [
        h('span', { 'data-day': 'friday' }, slots.day?.({ day: new CalendarDate(2026, 11, 13) })),
        h('span', { 'data-day': 'sunday' }, slots.day?.({ day: new CalendarDate(2026, 11, 15) })),
        h(
          'button',
          {
            type: 'button',
            onClick: () => emit('update:modelValue', new CalendarDate(2026, 11, 20)),
          },
          'pick'
        ),
      ])
    }
  },
})

const mountCalendar = (props: Record<string, unknown> = {}) =>
  mount(UiCalendar, {
    props: { label: 'Elige una fecha', ...props },
    global: { stubs: { UCalendar: CalendarStub } },
  })

describe('UiCalendar', () => {
  it('starts weeks on Sunday and is labelled', () => {
    mountCalendar()
    expect(received['week-starts-on']).toBe(0)
    expect(received['aria-label']).toBe('Elige una fecha')
  })

  it('reads ISO dates', () => {
    mountCalendar({ modelValue: '2026-11-14' })
    expect((received.modelValue as CalendarDate).toString()).toBe('2026-11-14')
  })

  it('writes ISO dates', async () => {
    const wrapper = mountCalendar()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['2026-11-20']])
  })

  it('disables past days using Israel time by default', () => {
    mountCalendar()
    expect(received['min-value']).toBeInstanceOf(CalendarDate)
    mountCalendar({ isPastDisabled: false })
    expect(received['min-value']).toBeUndefined()
  })

  it('highlights Friday and Saturday', () => {
    const wrapper = mountCalendar()
    expect(wrapper.find('[data-day="friday"] span').classes()).toContain('ui-calendar__weekend')
    expect(wrapper.find('[data-day="sunday"] span').classes()).not.toContain('ui-calendar__weekend')
  })
})

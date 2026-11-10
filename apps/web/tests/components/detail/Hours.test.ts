import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: { value: 'en' },
    t: (key: string, params?: unknown) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
  }),
}))

const Hours = (await import('~/app/components/detail/Hours.vue')).default

const mountHours = (weekly: Record<number, { start: number; end: number }[]> | null, today = 2) =>
  mount(Hours, { props: { hours: { weekly, isOpenNow: null, today } } })

describe('DetailHours', () => {
  it('lists the week from Sunday with today marked as the current date', () => {
    const wrapper = mountHours({ 0: [], 2: [{ start: 540, end: 1020 }] })
    const rows = wrapper.findAll('tbody tr')
    expect(rows.map((row) => row.find('th').text().split(' ')[0])).toEqual([
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ])
    expect(rows[2]!.attributes('aria-current')).toBe('date')
    expect(rows[2]!.find('th').text()).toContain('detail.today')
    expect(wrapper.findAll('[aria-current]')).toHaveLength(1)
  })

  it('describes closed, unknown, split and all-day hours', () => {
    const wrapper = mountHours({
      0: [],
      1: [{ start: 0, end: 1440 }],
      2: [
        { start: 390, end: 780 },
        { start: 960, end: 1200 },
      ],
    })
    const times = wrapper.findAll('td').map((cell) => cell.text())
    expect(times.slice(0, 4)).toEqual([
      'detail.closed',
      'detail.alwaysOpen',
      '06:30–13:00, 16:00–20:00',
      'detail.unknownHours',
    ])
  })

  it('has a table caption for screen readers', () => {
    expect(mountHours({}).find('caption').text()).toBe('detail.hours')
  })

  it('says when no hours were published', () => {
    expect(mountHours(null).find('table').exists()).toBe(false)
    expect(mountHours(null).text()).toBe('detail.unknownHours')
  })
})

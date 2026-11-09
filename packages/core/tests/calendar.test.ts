import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, isIsoDate, todayIn, toZonedMoment, weekdayOf } from '../src'

describe('calendar', () => {
  it('validates real calendar dates only', () => {
    expect(isIsoDate('2026-11-09')).toBe(true)
    expect(isIsoDate('2027-02-29')).toBe(false)
    expect(isIsoDate('2026-1-9')).toBe(false)
    expect(isIsoDate('not-a-date')).toBe(false)
  })

  it('adds days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28')
    expect(daysBetween('2026-12-25', '2027-01-01')).toBe(7)
  })

  it('numbers weekdays from sunday', () => {
    expect(weekdayOf('2026-11-08')).toBe(0)
    expect(weekdayOf('2026-11-14')).toBe(6)
  })

  it('uses the Israel time zone for the local date and time', () => {
    const lateFridayUtc = new Date('2026-11-13T22:30:00Z')
    expect(toZonedMoment(lateFridayUtc)).toEqual({ date: '2026-11-14', weekday: 6, minutes: 30 })
    expect(todayIn('Asia/Jerusalem', lateFridayUtc)).toBe('2026-11-14')
    expect(todayIn('UTC', lateFridayUtc)).toBe('2026-11-13')
  })

  it('follows daylight saving time in Israel', () => {
    expect(toZonedMoment(new Date('2027-07-01T09:00:00Z')).minutes).toBe(12 * 60)
    expect(toZonedMoment(new Date('2027-01-01T09:00:00Z')).minutes).toBe(11 * 60)
  })
})

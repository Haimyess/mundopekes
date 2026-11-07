import { describe, expect, it } from 'vitest'
import { SCHEDULE_DAYS, defaultSchedule, mergeSchedule } from '../src'

describe('defaultSchedule', () => {
  it('defines every day starting on sunday', () => {
    expect(Object.keys(defaultSchedule())).toEqual([...SCHEDULE_DAYS])
    expect(SCHEDULE_DAYS[0]).toBe('sunday')
  })

  it('returns a new object on every call', () => {
    const first = defaultSchedule()
    first.monday.open = false
    expect(defaultSchedule().monday.open).toBe(true)
  })
})

describe('mergeSchedule', () => {
  it('returns the defaults for null or undefined input', () => {
    expect(mergeSchedule(null)).toEqual(defaultSchedule())
    expect(mergeSchedule(undefined)).toEqual(defaultSchedule())
  })

  it('fills missing days with defaults', () => {
    const merged = mergeSchedule({ sunday: { open: true, start: '08:00', end: '12:00' } })
    expect(merged.sunday).toEqual({ open: true, start: '08:00', end: '12:00' })
    expect(merged.monday).toEqual(defaultSchedule().monday)
  })

  it('fills empty or blank times within a present day', () => {
    const merged = mergeSchedule({ monday: { open: true, start: '', end: '   ' } })
    expect(merged.monday).toEqual({ open: true, start: '09:00', end: '17:00' })
  })

  it('keeps an explicit closed flag over the default', () => {
    const merged = mergeSchedule({ monday: { open: false, start: '09:00', end: '17:00' } })
    expect(merged.monday.open).toBe(false)
  })
})

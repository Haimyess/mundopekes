import { describe, it, expect } from 'vitest'
import { parseGoogleHoursToSchedule } from '../../../../layers/domain/utils/schedule-mapping'
import { defaultSchedule } from '../../../../layers/domain/types/schedule'

describe('parseGoogleHoursToSchedule', () => {
  it('returns the default schedule when input is null/empty', () => {
    expect(parseGoogleHoursToSchedule(null)).toEqual(defaultSchedule())
    expect(parseGoogleHoursToSchedule([])).toEqual(defaultSchedule())
  })

  it('parses standard AM/PM English ranges into 24h', () => {
    const s = parseGoogleHoursToSchedule([
      'Monday: 9:00 AM – 5:00 PM',
      'Tuesday: 8:30 AM – 1:00 PM',
    ])
    expect(s.monday).toEqual({ open: true, start: '09:00', end: '17:00' })
    expect(s.tuesday).toEqual({ open: true, start: '08:30', end: '13:00' })
  })

  it('handles 12 AM/PM edge cases', () => {
    const s = parseGoogleHoursToSchedule([
      'Sunday: 12:00 AM – 12:00 PM',
      'Saturday: 12:30 PM – 11:45 PM',
    ])
    expect(s.sunday).toEqual({ open: true, start: '00:00', end: '12:00' })
    expect(s.saturday).toEqual({ open: true, start: '12:30', end: '23:45' })
  })

  it('marks closed days as not open', () => {
    const s = parseGoogleHoursToSchedule(['Friday: Closed'])
    expect(s.friday.open).toBe(false)
  })

  it('handles "Open 24 hours"', () => {
    const s = parseGoogleHoursToSchedule(['Monday: Open 24 hours'])
    expect(s.monday).toEqual({ open: true, start: '00:00', end: '23:59' })
  })

  it('falls back to default for unparseable lines', () => {
    const def = defaultSchedule()
    const s = parseGoogleHoursToSchedule(['Wednesday: horario raro sin formato'])
    expect(s.wednesday).toEqual(def.wednesday)
  })

  it('ignores lines for unknown day names (localized)', () => {
    const def = defaultSchedule()
    const s = parseGoogleHoursToSchedule(['יום שני: 09:00–17:00'])
    // No English day matched → schedule stays default
    expect(s).toEqual(def)
  })
})

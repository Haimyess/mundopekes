import { describe, expect, it } from 'vitest'
import { formatMinutes, isOpenAt, isOpenNow, parseOpeningHoursText } from '../src'

const HEBREW_SPLIT_SHIFT = [
  'יום ראשון: 6:30–13:00, 16:00–20:00',
  'יום שישי: 7:00–17:00',
  'יום שבת: סגור',
]

describe('parseOpeningHoursText', () => {
  it('returns null without usable lines', () => {
    expect(parseOpeningHoursText(null)).toBeNull()
    expect(parseOpeningHoursText([])).toBeNull()
    expect(parseOpeningHoursText(['horario raro'])).toBeNull()
  })

  it('parses Hebrew lines with several intervals and closed days', () => {
    expect(parseOpeningHoursText(HEBREW_SPLIT_SHIFT)).toEqual({
      0: [
        { start: 390, end: 780 },
        { start: 960, end: 1200 },
      ],
      5: [{ start: 420, end: 1020 }],
      6: [],
    })
  })

  it('parses Spanish, English and Russian day names', () => {
    expect(parseOpeningHoursText(['miércoles: 9:00–17:00'])).toEqual({
      3: [{ start: 540, end: 1020 }],
    })
    expect(parseOpeningHoursText(['Monday: 9:00 AM – 5:00 PM'])).toEqual({
      1: [{ start: 540, end: 1020 }],
    })
    expect(parseOpeningHoursText(['пятница: Закрыто'])).toEqual({ 5: [] })
  })

  it('understands "open 24 hours" in every language', () => {
    for (const line of [
      'lunes: Abierto 24 horas',
      'Monday: Open 24 hours',
      'יום שני: פתוח 24 שעות',
      'понедельник: Открыто круглосуточно',
    ]) {
      expect(parseOpeningHoursText([line])).toEqual({ 1: [{ start: 0, end: 1440 }] })
    }
  })

  it('handles Google spacing, inherited periods and 12 o’clock', () => {
    expect(parseOpeningHoursText(['Sunday: 9:00 – 11:30 AM'])).toEqual({
      0: [{ start: 540, end: 690 }],
    })
    expect(parseOpeningHoursText(['Sunday: 12:00 AM – 12:00 PM'])).toEqual({
      0: [{ start: 0, end: 720 }],
    })
  })

  it('extends intervals that close after midnight', () => {
    expect(parseOpeningHoursText(['viernes: 20:00–2:00'])).toEqual({
      5: [{ start: 1200, end: 1560 }],
    })
  })

  it('skips a day whose interval cannot be read', () => {
    expect(parseOpeningHoursText(['lunes: 9:00–17:00', 'martes: según temporada'])).toEqual({
      1: [{ start: 540, end: 1020 }],
    })
  })
})

describe('isOpenAt', () => {
  const hours = parseOpeningHoursText([...HEBREW_SPLIT_SHIFT, 'יום חמישי: 20:00–2:00'])!

  it('checks every interval of the day', () => {
    expect(isOpenAt(hours, { weekday: 0, minutes: 400 })).toBe(true)
    expect(isOpenAt(hours, { weekday: 0, minutes: 840 })).toBe(false)
    expect(isOpenAt(hours, { weekday: 0, minutes: 1200 })).toBe(false)
  })

  it('returns false on closed days and null on unknown days', () => {
    expect(isOpenAt(hours, { weekday: 6, minutes: 600 })).toBe(false)
    expect(isOpenAt(hours, { weekday: 2, minutes: 600 })).toBeNull()
  })

  it('keeps a place open after midnight from the day before', () => {
    expect(isOpenAt(hours, { weekday: 5, minutes: 60 })).toBe(true)
    expect(isOpenAt(hours, { weekday: 5, minutes: 120 })).toBe(false)
  })

  it('evaluates now in Israel time', () => {
    const sundayMorningInIsrael = new Date('2026-11-08T05:00:00Z')
    expect(isOpenNow(hours, sundayMorningInIsrael)).toBe(true)
  })
})

describe('formatMinutes', () => {
  it('formats minutes as HH:MM', () => {
    expect(formatMinutes(390)).toBe('06:30')
    expect(formatMinutes(1440)).toBe('23:59')
    expect(formatMinutes(1560)).toBe('02:00')
  })
})

import { describe, expect, it } from 'vitest'
import { formatIsoDate } from '~/app/utils/format-date'

describe('formatIsoDate', () => {
  it('formats the calendar day without shifting it by time zone', () => {
    expect(formatIsoDate('2026-12-01', 'en')).toBe('Tue, Dec 1')
    expect(formatIsoDate('2026-12-31', 'es')).toContain('31')
  })

  it('uses the locale of the interface', () => {
    expect(formatIsoDate('2026-12-01', 'he')).not.toBe(formatIsoDate('2026-12-01', 'en'))
  })
})

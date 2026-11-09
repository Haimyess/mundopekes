import { describe, expect, it } from 'vitest'
import { findOccasionRange, findUpcomingOccasion, type Occasion } from '../src'

const OCCASIONS: Occasion[] = [
  { key: 'hanukkah', startsOn: '2027-12-25', endsOn: '2028-01-01' },
  { key: 'hanukkah', startsOn: '2026-12-05', endsOn: '2026-12-12' },
  { key: 'purim', startsOn: '2027-03-23', endsOn: '2027-03-24' },
]

describe('findOccasionRange', () => {
  it('returns the next edition of the occasion', () => {
    expect(findOccasionRange(OCCASIONS, 'hanukkah', '2026-11-09')).toEqual({
      from: '2026-12-05',
      to: '2026-12-12',
    })
  })

  it('starts the range today while the occasion is running', () => {
    expect(findOccasionRange(OCCASIONS, 'hanukkah', '2026-12-08')).toEqual({
      from: '2026-12-08',
      to: '2026-12-12',
    })
  })

  it('moves to the following edition once one is over', () => {
    expect(findOccasionRange(OCCASIONS, 'hanukkah', '2026-12-13')?.from).toBe('2027-12-25')
  })

  it('returns null for unknown or finished occasions', () => {
    expect(findOccasionRange(OCCASIONS, 'sukkot', '2026-11-09')).toBeNull()
    expect(findOccasionRange(OCCASIONS, 'purim', '2027-03-25')).toBeNull()
  })
})

describe('findUpcomingOccasion', () => {
  it('returns an occasion starting within the horizon', () => {
    expect(findUpcomingOccasion(OCCASIONS, '2026-11-20')?.startsOn).toBe('2026-12-05')
  })

  it('returns null when nothing is close', () => {
    expect(findUpcomingOccasion(OCCASIONS, '2026-11-09')).toBeNull()
  })

  it('prefers the occasion that is running today', () => {
    expect(findUpcomingOccasion(OCCASIONS, '2026-12-12', 400)?.startsOn).toBe('2026-12-05')
  })

  it('keeps the caller fields', () => {
    const named = [{ ...OCCASIONS[1]!, name: 'Janucá' }]
    expect(findUpcomingOccasion(named, '2026-12-01')?.name).toBe('Janucá')
  })
})

import { describe, expect, it } from 'vitest'
import { ACTIVITY_BADGE_KEYS, getActivityBadges } from '../src'

describe('getActivityBadges', () => {
  it('returns an empty list for null or undefined sources', () => {
    expect(getActivityBadges(null)).toEqual([])
    expect(getActivityBadges(undefined)).toEqual([])
  })

  it('returns only truthy badge keys', () => {
    expect(
      getActivityBadges({ is_free: true, stroller_friendly: false, has_shadow: null })
    ).toEqual(['is_free'])
  })

  it('keeps the canonical key order regardless of source order', () => {
    expect(getActivityBadges({ has_bathrooms: true, open_weekends: true, is_free: true })).toEqual([
      'is_free',
      'open_weekends',
      'has_bathrooms',
    ])
  })

  it('returns every key when all badges apply', () => {
    const allBadges = Object.fromEntries(ACTIVITY_BADGE_KEYS.map((key) => [key, true]))
    expect(getActivityBadges(allBadges)).toEqual([...ACTIVITY_BADGE_KEYS])
  })
})

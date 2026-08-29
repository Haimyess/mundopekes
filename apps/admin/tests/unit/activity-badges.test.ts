import { describe, it, expect } from 'vitest'
import { useActivityBadges } from '../../../../layers/domain/composables/useActivityBadges'

describe('useActivityBadges', () => {
  it('returns an empty array for null/undefined', () => {
    expect(useActivityBadges(null)).toEqual([])
    expect(useActivityBadges(undefined)).toEqual([])
  })

  it('returns only the truthy badges, in canonical order', () => {
    const result = useActivityBadges({
      is_free: false,
      stroller_friendly: true,
      open_weekends: false,
      has_shadow: true,
      has_bathrooms: true,
    })
    expect(result).toEqual(['stroller_friendly', 'has_shadow', 'has_bathrooms'])
  })

  it('treats missing/null fields as false', () => {
    expect(useActivityBadges({ is_free: true })).toEqual(['is_free'])
  })

  it('includes has_shadow/has_bathrooms — previously never surfaced on web', () => {
    const result = useActivityBadges({ has_shadow: true, has_bathrooms: true })
    expect(result).toEqual(['has_shadow', 'has_bathrooms'])
  })
})

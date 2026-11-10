import { describe, expect, it } from 'vitest'
import {
  googleMapsSearchUrl,
  isQuickSuggestion,
  missingQuickSuggestionFields,
  quickSuggestionDetails,
  safeExternalLink,
} from '../../shared/utils/quick-suggestion'

const QUICK = {
  category_id: null,
  schedule: '',
  age_range: { ids: [] },
  location: { city: 'Ramat HaSharon', address: '' },
  metadata: {
    source: 'quick',
    where: 'Ramat HaSharon',
    link: 'https://instagram.com/granjalosolivos',
    why: 'Tienen cabras',
    origin: 'home',
    locale: 'es',
  },
}

describe('quick suggestions in the admin', () => {
  it('recognizes quick suggestions by their source', () => {
    expect(isQuickSuggestion(QUICK)).toBe(true)
    expect(isQuickSuggestion({ metadata: {} })).toBe(false)
    expect(isQuickSuggestion({ metadata: null })).toBe(false)
  })

  it('lists everything a fresh quick suggestion still needs', () => {
    expect(missingQuickSuggestionFields(QUICK)).toEqual([
      'location',
      'category',
      'ages',
      'hours',
      'title',
    ])
  })

  it('accepts unknown hours and a generated title once the admin completes it', () => {
    expect(
      missingQuickSuggestionFields({
        ...QUICK,
        category_id: 'cat',
        age_range: { ids: [8] },
        location: { city: 'Ramat HaSharon', address: 'Derech HaYam 1' },
        metadata: { ...QUICK.metadata, hours_unknown: true, title_i18n: { es: 'Granja' } },
      })
    ).toEqual([])
  })

  it('accepts coordinates and Google opening hours as complete data', () => {
    expect(
      missingQuickSuggestionFields({
        ...QUICK,
        location: { lat: 32.1, lng: 34.8 },
        metadata: { ...QUICK.metadata, opening_hours_text: ['Sunday: 9:00 AM – 5:00 PM'] },
      })
    ).toEqual(['category', 'ages', 'title'])
  })

  it('builds an encoded Google Maps search for the suggested place', () => {
    expect(googleMapsSearchUrl('Granja & Olivos', 'Ramat HaSharon')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Granja%20%26%20Olivos%2C%20Ramat%20HaSharon'
    )
  })

  it('shows what the user wrote with only safe links', () => {
    expect(quickSuggestionDetails(QUICK)).toEqual({
      where: 'Ramat HaSharon',
      link: 'https://instagram.com/granjalosolivos',
      why: 'Tienen cabras',
      origin: 'home',
      locale: 'es',
    })
    expect(safeExternalLink('javascript:alert(1)')).toBeNull()
    expect(safeExternalLink('not a url')).toBeNull()
  })
})

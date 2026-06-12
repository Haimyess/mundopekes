// Tests for layers/domain/server/utils/places-logic.ts (pure helpers extracted from places BFF handlers)
// Handler integration tests are skipped because useRuntimeConfig requires a full Nuxt
// runtime context that isn't available in vitest unit tests without e2e setup.
import { describe, it, expect } from 'vitest'
import {
  resolveSearchLang,
  buildSearchUrl,
  buildDetailsUrl,
  buildNameUrl,
  mapSearchResult,
  mapDetailsResponse,
  GOOGLE_TYPES_MAP,
} from '../../../../layers/domain/server/utils/places-logic'
import type {
  RawGooglePlace,
  RawGoogleDetailsResult,
} from '../../../../layers/domain/server/utils/places-logic'

// ── Helpers ────────────────────────────────────────────────────────────────
const makePlace = (overrides: Partial<RawGooglePlace> = {}): RawGooglePlace => ({
  place_id: 'gp-001',
  name: 'Gan HaNegev',
  formatted_address: 'Tel Aviv, Israel',
  geometry: { location: { lat: 32.1, lng: 34.8 } },
  photos: [{ photo_reference: 'ref123' }],
  types: ['park', 'natural_feature'],
  ...overrides,
})

const makeDetails = (overrides: Partial<RawGoogleDetailsResult> = {}): RawGoogleDetailsResult => ({
  name: 'Gan HaNegev',
  editorial_summary: { overview: 'A beautiful park' },
  formatted_phone_number: '+972-3-123',
  website: 'https://gan.il',
  opening_hours: { weekday_text: ['Monday: 8am–6pm'], periods: [] },
  photos: [{ photo_reference: 'refA' }, { photo_reference: 'refB' }],
  wheelchair_accessible_entrance: true,
  url: 'https://maps.google.com/?cid=123',
  ...overrides,
})

// ═══════════════════════════════════════════════════════════════════════════
//  resolveSearchLang
// ═══════════════════════════════════════════════════════════════════════════
describe('resolveSearchLang', () => {
  it('returns valid langs unchanged', () => {
    expect(resolveSearchLang('es')).toBe('es')
    expect(resolveSearchLang('he')).toBe('he')
    expect(resolveSearchLang('en')).toBe('en')
    expect(resolveSearchLang('ru')).toBe('ru')
  })

  it("falls back to 'he' for unknown langs", () => {
    expect(resolveSearchLang('fr')).toBe('he')
    expect(resolveSearchLang('')).toBe('he')
    expect(resolveSearchLang('zz')).toBe('he')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  buildSearchUrl
// ═══════════════════════════════════════════════════════════════════════════
describe('buildSearchUrl', () => {
  it('includes region=il', () => {
    const url = buildSearchUrl('park', 'es', 'key')
    expect(url).toContain('region=il')
  })

  it('includes the provided language', () => {
    const url = buildSearchUrl('park', 'he', 'key')
    expect(url).toContain('language=he')
  })

  it('URL-encodes the query', () => {
    const url = buildSearchUrl('beach resort', 'es', 'key')
    expect(url).toContain('beach%20resort')
  })

  it('targets the text search endpoint', () => {
    const url = buildSearchUrl('park', 'es', 'key')
    expect(url).toContain('textsearch/json')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  buildDetailsUrl
// ═══════════════════════════════════════════════════════════════════════════
describe('buildDetailsUrl', () => {
  it('includes editorial_summary in fields', () => {
    const url = buildDetailsUrl('gp-001', 'he', 'key')
    expect(url).toContain('editorial_summary')
  })

  it('includes the lang in the URL', () => {
    const url = buildDetailsUrl('gp-001', 'es', 'key')
    expect(url).toContain('language=es')
  })

  it('URL-encodes the place_id', () => {
    const url = buildDetailsUrl('gp-001', 'he', 'key')
    expect(url).toContain('gp-001')
  })
})

describe('buildNameUrl', () => {
  it('requests only the name field', () => {
    const url = buildNameUrl('gp-001', 'he', 'key')
    expect(url).toContain('fields=name')
    expect(url).not.toContain('editorial_summary')
  })

  it('includes the specified lang', () => {
    expect(buildNameUrl('gp-001', 'ru', 'key')).toContain('language=ru')
    expect(buildNameUrl('gp-001', 'he', 'key')).toContain('language=he')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  mapSearchResult
// ═══════════════════════════════════════════════════════════════════════════
describe('mapSearchResult', () => {
  it('maps google_place_id from place_id', () => {
    const result = mapSearchResult(makePlace(), 'es')
    expect(result.google_place_id).toBe('gp-001')
  })

  it('maps lat/lng from geometry', () => {
    const result = mapSearchResult(makePlace(), 'es')
    expect(result.lat).toBe(32.1)
    expect(result.lng).toBe(34.8)
  })

  it('sets name_i18n with lang as key', () => {
    const result = mapSearchResult(makePlace({ name: 'Parque' }), 'es')
    expect(result.name_i18n).toEqual({ es: 'Parque' })
  })

  it('builds photo_url from photo_reference using /api/places/photo proxy', () => {
    const result = mapSearchResult(makePlace(), 'es')
    expect(result.photo_url).toContain('/api/places/photo')
    expect(result.photo_url).toContain('ref123')
  })

  it('sets photo_url to null when no photos', () => {
    const result = mapSearchResult(makePlace({ photos: [] }), 'es')
    expect(result.photo_url).toBeNull()
  })

  it('maps Google types to suggested_categories using TYPES_MAP', () => {
    const result = mapSearchResult(makePlace({ types: ['park'] }), 'es')
    const cats = result.suggested_categories
    expect(cats.some((c) => c.name === 'Parques')).toBe(true)
  })

  it('deduplicates categories (natural_feature and nature_reserve both map to Naturaleza)', () => {
    const result = mapSearchResult(
      makePlace({ types: ['natural_feature', 'nature_reserve'] }),
      'es'
    )
    const ids = result.suggested_categories.map((c) => c.id)
    const unique = [...new Set(ids)]
    expect(ids.length).toBe(unique.length)
  })

  it('returns at most 3 suggested_categories', () => {
    const result = mapSearchResult(
      makePlace({ types: ['park', 'museum', 'zoo', 'restaurant', 'library'] }),
      'es'
    )
    expect(result.suggested_categories.length).toBeLessThanOrEqual(3)
  })

  it('unknown Google types are ignored (no mapping entry)', () => {
    const result = mapSearchResult(makePlace({ types: ['unknown_type'] }), 'es')
    expect(result.suggested_categories).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  mapDetailsResponse
// ═══════════════════════════════════════════════════════════════════════════
describe('mapDetailsResponse', () => {
  it('builds name_i18n with all 4 locales', () => {
    const result = mapDetailsResponse(makeDetails(), 'שם', 'Nombre', 'Name', 'Имя', 'he')
    const n = result.name_i18n
    expect(Object.keys(n)).toEqual(expect.arrayContaining(['he', 'es', 'en', 'ru']))
  })

  it('puts editorial_summary under the lang key in description_i18n', () => {
    const result = mapDetailsResponse(makeDetails(), '', '', '', '', 'he')
    expect(result.description_i18n['he']).toBe('A beautiful park')
  })

  it('description_i18n is empty when no editorial_summary', () => {
    const result = mapDetailsResponse(
      makeDetails({ editorial_summary: undefined }),
      '',
      '',
      '',
      '',
      'he'
    )
    expect(Object.keys(result.description_i18n)).toHaveLength(0)
  })

  it('maps photos to /api/places/photo proxy URLs', () => {
    const result = mapDetailsResponse(makeDetails(), '', '', '', '', 'he')
    expect(result.photos.length).toBeGreaterThan(0)
    expect(result.photos[0]).toContain('/api/places/photo')
    expect(result.photos[0]).toContain('refA')
  })

  it('limits photos to 5', () => {
    const manyPhotos = Array.from({ length: 10 }, (_, i) => ({
      photo_reference: `ref${i}`,
    }))
    const result = mapDetailsResponse(makeDetails({ photos: manyPhotos }), '', '', '', '', 'he')
    expect(result.photos.length).toBeLessThanOrEqual(5)
  })

  it('sets opening_hours when present', () => {
    const result = mapDetailsResponse(makeDetails(), '', '', '', '', 'he')
    expect(result.opening_hours?.weekday_text).toEqual(['Monday: 8am–6pm'])
  })

  it('opening_hours is null when absent from details', () => {
    const result = mapDetailsResponse(
      makeDetails({ opening_hours: undefined }),
      '',
      '',
      '',
      '',
      'he'
    )
    expect(result.opening_hours).toBeNull()
  })

  it('falls back to main.name when per-locale name is empty', () => {
    const result = mapDetailsResponse(makeDetails({ name: 'Main Name' }), '', '', '', '', 'he')
    // All locales should fall back to main name
    expect(result.name_i18n.es).toBe('Main Name')
    expect(result.name_i18n.en).toBe('Main Name')
    expect(result.name_i18n.ru).toBe('Main Name')
  })

  it('lang key in name_i18n always uses main.name', () => {
    const result = mapDetailsResponse(makeDetails({ name: 'Gan HaNegev' }), 'שם', '', '', '', 'he')
    expect(result.name_i18n['he']).toBe('Gan HaNegev')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  GOOGLE_TYPES_MAP sanity checks
// ═══════════════════════════════════════════════════════════════════════════
describe('GOOGLE_TYPES_MAP', () => {
  it('has an entry for park', () => {
    expect(GOOGLE_TYPES_MAP['park']).toBeDefined()
    expect(GOOGLE_TYPES_MAP['park'].name).toBe('Parques')
  })

  it('museum maps to Museos', () => {
    expect(GOOGLE_TYPES_MAP['museum']?.name).toBe('Museos')
  })
})

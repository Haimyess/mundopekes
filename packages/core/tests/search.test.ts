import { describe, expect, it } from 'vitest'
import { isAvailableInRange, searchRecords, type SearchCriteria, type SearchRecord } from '../src'

const PRESCHOOL = { minMonths: 36, maxMonths: 71 }
const SCHOOL = { minMonths: 72, maxMonths: 143 }

function record(overrides: Partial<SearchRecord> & { id: string }): SearchRecord {
  return {
    kind: 'activity',
    searchText: overrides.id,
    categorySlugs: [],
    isFree: false,
    price: null,
    ageRanges: [PRESCHOOL, SCHOOL],
    weeklyHours: null,
    amenities: [],
    discounts: [],
    location: null,
    createdAt: '2026-01-01',
    ...overrides,
  }
}

const BASE: SearchCriteria = { childAges: [], sort: 'recommended' }

const ids = (result: ReturnType<typeof searchRecords>) => result.hits.map(({ record }) => record.id)

describe('isAvailableInRange', () => {
  const weekendClosed = { 5: [], 6: [], 1: [{ start: 540, end: 1020 }] }

  it('keeps records without hours or with unknown days', () => {
    expect(isAvailableInRange(null, { from: '2026-11-13', to: '2026-11-14' })).toBe(true)
    expect(isAvailableInRange({ 5: [] }, { from: '2026-11-13', to: '2026-11-14' })).toBe(true)
  })

  it('drops records closed on every day of the range', () => {
    expect(isAvailableInRange(weekendClosed, { from: '2026-11-13', to: '2026-11-14' })).toBe(false)
    expect(isAvailableInRange(weekendClosed, { from: '2026-11-14', to: '2026-11-16' })).toBe(true)
  })
})

describe('searchRecords', () => {
  const records = [
    record({
      id: 'museum',
      searchText: 'Museo del Juguete',
      categorySlugs: ['museums', 'indoor'],
      price: 35,
      createdAt: '2026-03-01',
    }),
    record({
      id: 'park',
      searchText: 'Parque Hayarkon',
      categorySlugs: ['outdoor'],
      isFree: true,
      createdAt: '2026-02-01',
    }),
    record({
      id: 'teens',
      searchText: 'Escape room',
      categorySlugs: ['indoor'],
      price: 80,
      ageRanges: [{ minMonths: 144, maxMonths: 215 }],
      createdAt: '2026-04-01',
    }),
    record({
      id: 'place',
      kind: 'place',
      searchText: 'Museo de Ciencia',
      categorySlugs: ['museums'],
      price: 0,
      createdAt: '2026-01-15',
    }),
  ]

  it('returns everything newest first without criteria', () => {
    expect(ids(searchRecords(records, BASE))).toEqual(['teens', 'museum', 'park', 'place'])
  })

  it('filters by text, free and category', () => {
    expect(ids(searchRecords(records, { ...BASE, text: 'museo' }))).toEqual(['museum', 'place'])
    expect(ids(searchRecords(records, { ...BASE, isFree: true }))).toEqual(['park', 'place'])
    expect(ids(searchRecords(records, { ...BASE, categorySlug: 'indoor' }))).toEqual([
      'teens',
      'museum',
    ])
  })

  it('counts categories without applying the category filter', () => {
    const { facets, total } = searchRecords(records, { ...BASE, categorySlug: 'museums' })
    expect(total).toBe(2)
    expect(facets).toMatchObject({ total: 4, categories: { museums: 2, indoor: 2, outdoor: 1 } })
  })

  it('ranks by age fit and labels partial matches', () => {
    const result = searchRecords(records, { ...BASE, childAges: [4, 14] })
    expect(ids(result)).toEqual(['teens', 'museum', 'park', 'place'])
    expect(result.hits.every(({ fit }) => fit === 'some')).toBe(true)
    expect(result.hits[0]?.matchingAges).toEqual([14])
  })

  it('keeps category counts equal to what each category would list', () => {
    const many = [
      ...['a', 'b', 'c', 'd'].map((id) => record({ id, categorySlugs: ['indoor'] })),
      record({ id: 'partial', categorySlugs: ['outdoor'], ageRanges: [SCHOOL] }),
    ]
    const result = searchRecords(many, { ...BASE, childAges: [4, 8] })
    expect(result.total).toBe(4)
    expect(result.facets.categories).toEqual({ indoor: 4, outdoor: 1 })
    expect(
      ids(searchRecords(many, { ...BASE, childAges: [4, 8], categorySlug: 'outdoor' }))
    ).toEqual(['partial'])
  })

  it('sorts by price with free first and unknown prices last', () => {
    const result = searchRecords([record({ id: 'unknown' }), ...records], {
      ...BASE,
      sort: 'price',
    })
    expect(ids(result)).toEqual(['park', 'place', 'museum', 'teens', 'unknown'])
  })

  it('filters by date range using the weekly hours', () => {
    const closedSaturday = record({ id: 'closed', weeklyHours: { 6: [] } })
    const result = searchRecords([closedSaturday, records[0]!], {
      ...BASE,
      dateRange: { from: '2026-11-14', to: '2026-11-14' },
    })
    expect(ids(result)).toEqual(['museum'])
  })

  it('paginates and reports the page count', () => {
    const result = searchRecords(records, BASE, 2, 3)
    expect(ids(result)).toEqual(['place'])
    expect(result.matches.map(({ record }) => record.id)).toEqual([
      'teens',
      'museum',
      'park',
      'place',
    ])
    expect(result).toMatchObject({ total: 4, page: 2, pageCount: 2 })
  })

  it('returns an empty page beyond the last one', () => {
    expect(searchRecords(records, BASE, 9, 3)).toMatchObject({ hits: [], pageCount: 2 })
  })

  it('filters by kind and counts the kinds without that filter', () => {
    const result = searchRecords(records, { ...BASE, kind: 'place' })
    expect(ids(result)).toEqual(['place'])
    expect(result.facets.kinds).toEqual({ activity: 3, place: 1 })
  })

  it('requires every selected amenity and counts amenities within the hits', () => {
    const withAmenities = [
      record({ id: 'both', amenities: ['stroller', 'shade'] }),
      record({ id: 'stroller', amenities: ['stroller'] }),
      record({ id: 'none' }),
    ]
    const result = searchRecords(withAmenities, { ...BASE, amenities: ['stroller'] })
    expect(ids(result)).toEqual(['both', 'stroller'])
    expect(result.facets.amenities).toMatchObject({
      stroller: 2,
      wheelchair: 0,
      kosher: 0,
      shade: 1,
    })
    expect(
      ids(searchRecords(withAmenities, { ...BASE, amenities: ['stroller', 'shade'] }))
    ).toEqual(['both'])
  })

  it('keeps only records known to be open at the given moment', () => {
    const open = record({ id: 'open', weeklyHours: { 1: [{ start: 540, end: 1020 }] } })
    const closed = record({ id: 'closed', weeklyHours: { 1: [] } })
    const unknown = record({ id: 'unknown' })
    const result = searchRecords([open, closed, unknown], {
      ...BASE,
      openAt: { weekday: 1, minutes: 600 },
    })
    expect(ids(result)).toEqual(['open'])
  })

  it('requires every selected discount and counts them within the hits', () => {
    const withDiscounts = [
      record({ id: 'club', discounts: ['club', 'last-minute'] }),
      record({ id: 'card', discounts: ['credit-card'] }),
    ]
    const result = searchRecords(withDiscounts, { ...BASE, discounts: ['club'] })
    expect(ids(result)).toEqual(['club'])
    expect(result.facets.discounts).toEqual({ club: 1, 'credit-card': 0, 'last-minute': 1 })
  })

  it('filters by price band treating free as zero and unknown prices as out', () => {
    const priced = [
      record({ id: 'cheap', price: 60 }),
      record({ id: 'free', isFree: true }),
      record({ id: 'pricey', price: 250 }),
      record({ id: 'unknown' }),
    ]
    const cheap = searchRecords(priced, { ...BASE, priceBand: 'up-to-80' })
    expect(ids(cheap).sort()).toEqual(['cheap', 'free'])
    expect(cheap.facets.priceBands).toEqual({ 'up-to-80': 2, 'from-200': 1 })
    expect(ids(searchRecords(priced, { ...BASE, priceBand: 'from-200' }))).toEqual(['pricey'])
  })

  it('filters by radius around an origin and sorts by distance', () => {
    const telAviv = { lat: 32.0853, lng: 34.7818 }
    const located = [
      record({ id: 'jaffa', location: { lat: 32.05, lng: 34.75 }, createdAt: '2026-01-01' }),
      record({ id: 'herzliya', location: { lat: 32.1624, lng: 34.8447 }, createdAt: '2026-03-01' }),
      record({ id: 'haifa', location: { lat: 32.794, lng: 34.9896 } }),
      record({ id: 'nowhere' }),
    ]
    const nearby = searchRecords(located, {
      ...BASE,
      origin: telAviv,
      radiusKm: 25,
      sort: 'distance',
    })
    expect(ids(nearby)).toEqual(['jaffa', 'herzliya'])
    expect(nearby.hits[0]?.distanceKm).toBeGreaterThan(4)
    expect(nearby.hits[0]?.distanceKm).toBeLessThan(6)
  })

  it('keeps the default order when sorting by distance without an origin', () => {
    const result = searchRecords(records, { ...BASE, sort: 'distance' })
    expect(ids(result)).toEqual(['teens', 'museum', 'park', 'place'])
    expect(result.hits.every(({ distanceKm }) => distanceKm === null)).toBe(true)
  })

  it('keeps only located records inside the map bounds', () => {
    const located = [
      record({ id: 'inside', location: { lat: 32.08, lng: 34.78 } }),
      record({ id: 'outside', location: { lat: 31.25, lng: 34.79 } }),
      record({ id: 'unknown' }),
    ]
    const result = searchRecords(located, {
      ...BASE,
      bounds: { south: 32, west: 34.7, north: 32.2, east: 34.9 },
    })
    expect(ids(result)).toEqual(['inside'])
  })
})

import { describe, expect, it } from 'vitest'
import {
  familyCookieToSearchQuery,
  parseFamilyCookie,
  searchQuerySchema,
  toFamilyCookie,
} from '../src'

const SAVED_AT = new Date('2026-11-03T08:00:00Z')

describe('family cookie', () => {
  it('stores the search with relative dates, city only and filter tokens', () => {
    const state = searchQuerySchema.parse({
      ages: '3,7',
      where: 'city:tel-aviv',
      radius: '10',
      when: 'this-weekend',
      category: 'indoor-juego',
      free: 'true',
      amenities: 'stroller,shade',
      discounts: 'club',
      price: 'up-to-80',
      kind: 'place',
      open: 'now',
      sort: 'price',
      page: '3',
    })
    expect(toFamilyCookie(state, SAVED_AT)).toEqual({
      v: 1,
      ages: [
        [3, 3],
        [7, 7],
      ],
      city: 'tel-aviv',
      radiusKm: 10,
      when: 'this-weekend',
      filters: [
        'category:indoor-juego',
        'free',
        'kind:place',
        'price:up-to-80',
        'open:now',
        'amenity:stroller',
        'amenity:shade',
        'discount:club',
      ],
      savedAt: '2026-11-03T08:00:00.000Z',
    })
  })

  it('never stores the exact position of the device', () => {
    const state = searchQuerySchema.parse({ where: 'point:32.08,34.78', radius: '5', ages: '4' })
    const cookie = toFamilyCookie(state, SAVED_AT)
    expect(cookie.city).toBeUndefined()
    expect(cookie.radiusKm).toBeUndefined()
    expect(JSON.stringify(cookie)).not.toContain('32.08')
  })

  it('round-trips into the search state without sort or page', () => {
    const state = searchQuerySchema.parse({
      ages: '3,7',
      where: 'city:haifa',
      radius: '25',
      when: 'occasion:hanukkah',
      category: 'aire-libre',
      amenities: 'kosher',
      sort: 'newest',
    })
    const { sort: _sort, ...expected } = state
    expect(familyCookieToSearchQuery(toFamilyCookie(state, SAVED_AT))).toEqual(expected)
  })

  it('reads the design example with age ranges by the youngest age of each child', () => {
    const cookie = parseFamilyCookie({
      v: 1,
      ages: [
        [3, 4],
        [7, 8],
      ],
      city: 'tel-aviv',
      radiusKm: 15,
      when: 'this-weekend',
      filters: ['indoor'],
      savedAt: '2026-11-03T10:00:00+02:00',
    })
    expect(cookie).not.toBeNull()
    expect(familyCookieToSearchQuery(cookie!)).toEqual({
      ages: [3, 7],
      where: { kind: 'city', slug: 'tel-aviv' },
      radius: undefined,
      when: { kind: 'shortcut', shortcut: 'this-weekend' },
    })
  })

  it('rejects tampered cookies and drops unknown values', () => {
    expect(parseFamilyCookie('not json')).toBeNull()
    expect(
      parseFamilyCookie({ v: 2, ages: [], filters: [], savedAt: SAVED_AT.toISOString() })
    ).toBeNull()
    expect(
      parseFamilyCookie({ v: 1, ages: [[30, 40]], filters: [], savedAt: SAVED_AT.toISOString() })
    ).toBeNull()
    const lenient = parseFamilyCookie({
      v: 1,
      ages: [],
      city: 'atlantis',
      when: 'someday',
      filters: ['category:<script>', 'amenity:pool', 'free'],
      savedAt: SAVED_AT.toISOString(),
    })
    expect(familyCookieToSearchQuery(lenient!)).toEqual({
      free: true,
      ages: undefined,
      where: undefined,
      radius: undefined,
      when: undefined,
    })
  })
})

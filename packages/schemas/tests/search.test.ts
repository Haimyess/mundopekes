import { describe, expect, it } from 'vitest'
import {
  childAgesQuerySchema,
  childAgesSchema,
  searchQuerySchema,
  VALIDATION_ERRORS,
  whenQuerySchema,
} from '../src'

describe('childAgesQuerySchema', () => {
  it('parses a comma separated list of ages', () => {
    expect(childAgesQuerySchema.parse('3,7')).toEqual([3, 7])
    expect(childAgesQuerySchema.parse(' ')).toEqual([])
  })

  it.each(['3,abc', '3,18', '-1', '2.5', '1,2,3,4,5,6,7'])('rejects %j', (value) => {
    expect(childAgesQuerySchema.safeParse(value).success).toBe(false)
  })

  it('reports translatable errors', () => {
    const result = childAgesSchema.safeParse([20])
    expect(result.error?.issues[0]?.message).toBe(VALIDATION_ERRORS.invalidNumber)
  })
})

describe('whenQuerySchema', () => {
  it('turns the query value into a structured when', () => {
    expect(whenQuerySchema.parse('this-weekend')).toEqual({
      kind: 'shortcut',
      shortcut: 'this-weekend',
    })
    expect(whenQuerySchema.parse('occasion:pesach')).toEqual({ kind: 'occasion', key: 'pesach' })
  })

  it('rejects unknown values with a translatable error', () => {
    const result = whenQuerySchema.safeParse('next-year')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(VALIDATION_ERRORS.invalidOption)
  })
})

describe('searchQuerySchema', () => {
  it('parses a full search query', () => {
    expect(
      searchQuerySchema.parse({
        q: ' museo ',
        category: 'indoor-juego',
        when: 'this-weekend',
        ages: '3,7',
        free: 'true',
        sort: 'price',
        page: '2',
      })
    ).toEqual({
      q: 'museo',
      category: 'indoor-juego',
      when: { kind: 'shortcut', shortcut: 'this-weekend' },
      ages: [3, 7],
      free: true,
      sort: 'price',
      page: 2,
    })
  })

  it('drops invalid or repeated params instead of failing', () => {
    expect(
      searchQuerySchema.parse({
        q: ['a', 'b'],
        category: 'Bad Slug',
        when: 'someday',
        ages: '3,40',
        free: 'yes',
        sort: 'random',
        page: '0',
      })
    ).toEqual({})
  })

  it('treats empty text and empty ages as absent', () => {
    expect(searchQuerySchema.parse({ q: '   ', ages: '' })).toEqual({})
  })

  it('parses the kind, amenities in canonical order and open now', () => {
    expect(
      searchQuerySchema.parse({ kind: 'place', amenities: 'shade,stroller,shade', open: 'now' })
    ).toEqual({ kind: 'place', amenities: ['stroller', 'shade'], open: 'now' })
  })

  it('parses price bands and discounts', () => {
    expect(
      searchQuerySchema.parse({
        price: 'up-to-80',
        discounts: 'last-minute,club',
        amenities: 'kosher,safe-room',
      })
    ).toEqual({
      price: 'up-to-80',
      discounts: ['club', 'last-minute'],
      amenities: ['safe-room', 'kosher'],
    })
    expect(searchQuerySchema.parse({ price: 'cheap', discounts: 'coupon' })).toEqual({})
  })

  it('drops unknown kinds, amenities and open values', () => {
    expect(searchQuerySchema.parse({ kind: 'event', amenities: 'pool', open: 'later' })).toEqual({})
    expect(searchQuerySchema.parse({ amenities: '' })).toEqual({})
  })

  it('parses where, radius, bounds and view', () => {
    expect(
      searchQuerySchema.parse({
        where: 'point:32.0853,34.7818',
        radius: '10',
        bbox: '32,34.7,32.2,34.9',
        view: 'map',
        sort: 'distance',
      })
    ).toEqual({
      where: { kind: 'point', point: { lat: 32.09, lng: 34.78 } },
      radius: 10,
      bbox: { south: 32, west: 34.7, north: 32.2, east: 34.9 },
      view: 'map',
      sort: 'distance',
    })
  })

  it('drops unknown places, radii, inverted bounds and views', () => {
    expect(
      searchQuerySchema.parse({
        where: 'city:atlantis',
        radius: '7',
        bbox: '32.2,34.9,32,34.7',
        view: 'grid',
      })
    ).toEqual({})
  })

  it('ignores unknown legacy params', () => {
    expect(searchQuerySchema.parse({ age: '6', city: 'Haifa' })).toEqual({})
  })
})

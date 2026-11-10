import { describe, expect, it } from 'vitest'
import {
  parseSearchQuery,
  patchSearchState,
  toSearchLocation,
  toSearchQuery,
} from '~/app/utils/search-query'

describe('search query helpers', () => {
  it('round-trips a full query', () => {
    const query = {
      q: 'museo',
      category: 'aire-libre',
      when: 'fixed:2026-12-01/2026-12-03',
      ages: '3,7',
      free: 'true',
      sort: 'price',
      page: '2',
    }
    expect(toSearchQuery(parseSearchQuery(query))).toEqual(query)
  })

  it('serializes where, radius, bounds and the map view', () => {
    expect(
      toSearchQuery({
        where: { kind: 'point', point: { lat: 32.0853, lng: 34.7818 } },
        radius: 10,
        bbox: { south: 32, west: 34.7, north: 32.2, east: 34.9 },
        view: 'map',
      })
    ).toEqual({
      where: 'point:32.09,34.78',
      radius: '10',
      bbox: '32.0000,34.7000,32.2000,34.9000',
      view: 'map',
    })
    expect(toSearchQuery({ radius: 10, view: 'list' })).toEqual({})
  })

  it('serializes amenities in one canonical order', () => {
    expect(toSearchQuery({ amenities: ['shade', 'stroller'] })).toEqual({
      amenities: 'stroller,shade',
    })
  })

  it('omits defaults from the URL', () => {
    expect(toSearchQuery({ sort: 'recommended', page: 1, ages: [] })).toEqual({})
  })

  it('drops invalid and legacy params', () => {
    expect(parseSearchQuery({ age: '6', when: 'nope', page: '-1' })).toEqual({})
  })

  it('resets the page when any filter changes', () => {
    const state = parseSearchQuery({ category: 'aire-libre', page: '3' })
    expect(patchSearchState(state, { free: true })).toEqual({
      category: 'aire-libre',
      free: true,
      page: undefined,
    })
    expect(patchSearchState(state, { page: 4 })).toEqual({ category: 'aire-libre', page: 4 })
  })

  it('builds a search location', () => {
    expect(toSearchLocation({ free: true })).toEqual({ path: '/search', query: { free: 'true' } })
  })
})

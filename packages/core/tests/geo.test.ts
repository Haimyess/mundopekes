import { describe, expect, it } from 'vitest'
import { distanceKm, findCity, isInBounds, ISRAEL_CITIES, roundCoordinate } from '../src'

describe('distanceKm', () => {
  it('measures great-circle distances in kilometres', () => {
    const telAviv = findCity('tel-aviv')!
    const jerusalem = findCity('jerusalem')!
    expect(distanceKm(telAviv, jerusalem)).toBeGreaterThan(50)
    expect(distanceKm(telAviv, jerusalem)).toBeLessThan(60)
    expect(distanceKm(telAviv, telAviv)).toBe(0)
  })
})

describe('isInBounds', () => {
  const bounds = { south: 32, west: 34.7, north: 32.2, east: 34.9 }

  it('includes points inside the box and its edges only', () => {
    expect(isInBounds({ lat: 32.08, lng: 34.78 }, bounds)).toBe(true)
    expect(isInBounds({ lat: 32.2, lng: 34.9 }, bounds)).toBe(true)
    expect(isInBounds({ lat: 32.79, lng: 34.98 }, bounds)).toBe(false)
  })
})

describe('roundCoordinate', () => {
  it('rounds to the given decimals', () => {
    expect(roundCoordinate(32.08539, 2)).toBe(32.09)
  })
})

describe('ISRAEL_CITIES', () => {
  it('has unique slugs, names in every content locale and coordinates inside Israel', () => {
    expect(new Set(ISRAEL_CITIES.map(({ slug }) => slug)).size).toBe(ISRAEL_CITIES.length)
    for (const city of ISRAEL_CITIES) {
      expect(Object.keys(city.names).sort()).toEqual(['en', 'es', 'he', 'ru'])
      expect(city.lat).toBeGreaterThan(29.4)
      expect(city.lat).toBeLessThan(33.4)
      expect(city.lng).toBeGreaterThan(34.2)
      expect(city.lng).toBeLessThan(35.9)
    }
  })
})

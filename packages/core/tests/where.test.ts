import { describe, expect, it } from 'vitest'
import { parseWhere, resolveWhereOrigin, serializeWhere, toPrivatePoint } from '../src'

describe('parseWhere', () => {
  it('accepts known city slugs', () => {
    expect(parseWhere('city:haifa')).toEqual({ kind: 'city', slug: 'haifa' })
  })

  it('rounds points to about a kilometre for privacy', () => {
    expect(parseWhere('point:32.08539,34.78181')).toEqual({
      kind: 'point',
      point: { lat: 32.09, lng: 34.78 },
    })
  })

  it.each(['city:atlantis', 'point:abc,34', 'point:95,34', 'point:32', 'haifa', ''])(
    'rejects %j',
    (raw) => {
      expect(parseWhere(raw)).toBeNull()
    }
  )
})

describe('serializeWhere', () => {
  it('round-trips cities and rounded points', () => {
    expect(serializeWhere({ kind: 'city', slug: 'eilat' })).toBe('city:eilat')
    expect(serializeWhere({ kind: 'point', point: { lat: 32.08539, lng: 34.78181 } })).toBe(
      'point:32.09,34.78'
    )
  })
})

describe('resolveWhereOrigin', () => {
  it('returns the city centre or the point', () => {
    expect(resolveWhereOrigin({ kind: 'city', slug: 'haifa' })).toEqual({
      lat: 32.794,
      lng: 34.9896,
    })
    expect(resolveWhereOrigin({ kind: 'point', point: { lat: 31.5, lng: 34.9 } })).toEqual({
      lat: 31.5,
      lng: 34.9,
    })
    expect(resolveWhereOrigin({ kind: 'city', slug: 'gone' })).toBeNull()
  })

  it('keeps the private point stable', () => {
    expect(toPrivatePoint({ lat: 31.999, lng: 34.001 })).toEqual({ lat: 32, lng: 34 })
  })
})

import { describe, expect, it } from 'vitest'
import { buildContact, safeWebsite, whatsappUrl } from '../../server/utils/detail-contact'

describe('safeWebsite', () => {
  it('keeps http and https links only', () => {
    expect(safeWebsite('https://park.co.il')).toBe('https://park.co.il/')
    expect(safeWebsite('javascript:alert(1)')).toBeNull()
    expect(safeWebsite('not a url')).toBeNull()
    expect(safeWebsite(42)).toBeNull()
  })
})

describe('whatsappUrl', () => {
  it('builds a link only for Israeli mobile numbers', () => {
    expect(whatsappUrl('050-123-4567')).toBe('https://wa.me/972501234567')
    expect(whatsappUrl('03-627-3927')).toBeNull()
    expect(whatsappUrl(null)).toBeNull()
  })
})

describe('buildContact', () => {
  it('prefers coordinates for directions and falls back to the Google link', () => {
    expect(
      buildContact({ phone: ' 054-000-1111 ', website: 'http://x.co.il' }, { lat: 32.1, lng: 34.8 })
    ).toEqual({
      phone: '054-000-1111',
      website: 'http://x.co.il/',
      whatsappUrl: 'https://wa.me/972540001111',
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=32.1,34.8',
      wazeUrl: 'https://waze.com/ul?ll=32.1,34.8&navigate=yes',
    })
    expect(buildContact({ google_url: 'https://maps.google.com/?cid=1' }, null)).toMatchObject({
      directionsUrl: 'https://maps.google.com/?cid=1',
      wazeUrl: null,
      phone: null,
    })
  })
})

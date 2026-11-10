import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SearchDataset } from '../../server/utils/search-records'

const PLACE_ID = '7e0169f7-46f3-4659-a59a-8631148f6260'
let routeId = PLACE_ID
let placeStatus: string | null = null
let dataset: SearchDataset

vi.mock('../../server/utils/search-dataset', () => ({
  getSearchDataset: vi.fn(async () => dataset),
  getPlaceStatus: vi.fn(async () => placeStatus),
}))

const h3 = await import('h3')
vi.stubGlobal('defineEventHandler', h3.defineEventHandler)
vi.stubGlobal('createError', h3.createError)
vi.stubGlobal('getRouterParam', () => routeId)

const { default: handler } = await import('../../server/api/places/[id].get')
const event = {} as Parameters<typeof handler>[0]

const PLACE = {
  id: PLACE_ID,
  lat: 32.1,
  lng: 34.8,
  name_i18n: { es: 'Parque Yarkon' },
  description_i18n: { es: 'Un gran parque' },
  images: ['https://example.com/a.jpg'],
  created_at: '2026-01-01',
  updated_at: '2026-09-05',
  metadata: {
    phone: '03-627-3927',
    website: 'http://www.park.co.il/',
    address: 'Rokach 1',
    photos: ['https://example.com/a.jpg', '/api/places/photo?ref=b'],
    place_photo_url: '/api/places/photo?ref=c',
    opening_hours_text: ['lunes: Abierto 24 horas'],
    wheelchair: true,
  },
  city: { name: 'Tel Aviv' },
}

function activity(id: string, created_at: string) {
  return {
    id,
    title_i18n: { es: id },
    price: 20,
    is_free: false,
    stroller_friendly: true,
    images: null,
    created_at,
    metadata: null,
    category_id: null,
    place: PLACE,
    age_ranges: [{ age_range: { min_months: 36, max_months: 71 } }],
  }
}

beforeEach(() => {
  routeId = PLACE_ID
  placeStatus = null
  dataset = {
    activities: [activity('older', '2026-01-01'), activity('newer', '2026-05-01')],
    places: [PLACE],
    categories: [],
  }
})

describe('GET /api/places/:id', () => {
  it('returns the place built from stored data', async () => {
    const detail = await handler(event)
    expect(detail).toMatchObject({
      id: PLACE_ID,
      name: { es: 'Parque Yarkon' },
      description: { es: 'Un gran parque' },
      images: ['https://example.com/a.jpg', '/api/places/photo?ref=b', '/api/places/photo?ref=c'],
      cityName: 'Tel Aviv',
      address: 'Rokach 1',
      location: { lat: 32.1, lng: 34.8 },
      contact: { phone: '03-627-3927', website: 'http://www.park.co.il/', whatsappUrl: null },
      amenities: ['stroller', 'wheelchair'],
      price: 20,
      ageSpan: { min: 3, max: 5 },
      updatedAt: '2026-09-05',
    })
    expect(detail.hours.weekly).toEqual({ 1: [{ start: 0, end: 1440 }] })
    expect(detail.activities.map(({ id }) => id)).toEqual(['newer', 'older'])
  })

  it('answers 404 for malformed or unknown ids', async () => {
    routeId = 'details'
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 })
    routeId = '00000000-0000-4000-8000-000000000000'
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('answers 410 for places that were closed', async () => {
    routeId = '00000000-0000-4000-8000-000000000000'
    placeStatus = 'inactive'
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 410 })
  })
})

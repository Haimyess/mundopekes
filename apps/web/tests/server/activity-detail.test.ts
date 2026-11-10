import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SearchDataset } from '../../server/utils/search-records'

const ACTIVITY_ID = '48db68d0-848f-4285-8625-7d432abb1525'
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'
let routeId = ACTIVITY_ID
let activityStatus: { status: string | null; placeStatus: string | null } | null = null
let dataset: SearchDataset

vi.mock('../../server/utils/search-dataset', () => ({
  getSearchDataset: vi.fn(async () => dataset),
  getActivityStatus: vi.fn(async () => activityStatus),
}))

const h3 = await import('h3')
vi.stubGlobal('defineEventHandler', h3.defineEventHandler)
vi.stubGlobal('createError', h3.createError)
vi.stubGlobal('getRouterParam', () => routeId)

const { default: handler } = await import('../../server/api/activities/[id].get')
const event = {} as Parameters<typeof handler>[0]

const PLACE = {
  id: 'place-1',
  lat: 32.1,
  lng: 34.8,
  name_i18n: { es: 'Parque Yarkon' },
  images: ['https://example.com/place.jpg'],
  created_at: '2026-01-01',
  metadata: { phone: '050-123-4567', website: 'https://park.co.il', address: 'Rokach 1' },
  city: { name: 'Tel Aviv' },
}

function activity(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title_i18n: { es: `Actividad ${id}` },
    description_i18n: { es: 'Descripción' },
    price: null,
    is_free: true,
    stroller_friendly: false,
    images: ['https://example.com/activity.jpg'],
    created_at: '2026-01-01',
    updated_at: '2026-09-01',
    metadata: { website: 'https://activity.co.il', has_shadow: true },
    category_id: 'cat-park',
    place: PLACE,
    age_ranges: [{ age_range: { min_months: 72, max_months: 143 } }],
    ...overrides,
  }
}

beforeEach(() => {
  routeId = ACTIVITY_ID
  activityStatus = null
  dataset = {
    activities: [activity(ACTIVITY_ID), activity('sibling', { created_at: '2026-02-01' })],
    places: [PLACE],
    categories: [{ id: 'cat-park', slug: 'parque', parent_id: null, name_i18n: { es: 'Parques' } }],
  }
})

describe('GET /api/activities/:id', () => {
  it('returns the activity with its venue, contact and sibling activities', async () => {
    const detail = await handler(event)
    expect(detail).toMatchObject({
      id: ACTIVITY_ID,
      title: { es: `Actividad ${ACTIVITY_ID}` },
      description: { es: 'Descripción' },
      categoryName: { es: 'Parques' },
      categorySlug: 'parque',
      images: ['https://example.com/activity.jpg', 'https://example.com/place.jpg'],
      venue: {
        id: 'place-1',
        name: { es: 'Parque Yarkon' },
        cityName: 'Tel Aviv',
        address: 'Rokach 1',
        imageUrl: 'https://example.com/place.jpg',
      },
      contact: {
        phone: '050-123-4567',
        website: 'https://activity.co.il/',
        whatsappUrl: 'https://wa.me/972501234567',
      },
      amenities: ['shade'],
      isFree: true,
      ageSpan: { min: 6, max: 11 },
      updatedAt: '2026-09-01',
    })
    expect(detail.moreAtPlace.map(({ id }) => id)).toEqual(['sibling'])
  })

  it('answers 404 for malformed, unknown, pending or rejected activities', async () => {
    routeId = 'not-a-uuid'
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 })
    routeId = UNKNOWN_ID
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 })
    activityStatus = { status: 'pending', placeStatus: 'active' }
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('answers 410 for closed activities and activities of closed places', async () => {
    routeId = UNKNOWN_ID
    activityStatus = { status: 'archived', placeStatus: 'active' }
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 410 })
    activityStatus = { status: 'approved', placeStatus: 'inactive' }
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 410 })
  })
})

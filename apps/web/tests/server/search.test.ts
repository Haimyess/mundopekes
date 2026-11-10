import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SearchDataset } from '../../server/utils/search-records'

let mockQuery: Record<string, unknown> = {}
let mockDataset: SearchDataset
const mockOccasions = [
  { key: 'hanukkah', name: { he: 'חנוכה' }, startsOn: '2026-12-05', endsOn: '2026-12-12' },
]

vi.mock('../../server/utils/search-dataset', () => ({
  getSearchDataset: vi.fn(async () => mockDataset),
  getUpcomingOccasions: vi.fn(async () => mockOccasions),
}))

vi.mock('@mundopekes/core', async (importOriginal) => {
  const core = await importOriginal<typeof import('@mundopekes/core')>()
  return {
    ...core,
    todayIn: () => '2026-11-20',
    toZonedMoment: () => ({ date: '2026-11-20', weekday: 5, minutes: 600 }),
  }
})

const h3 = await import('h3')
vi.stubGlobal('defineEventHandler', h3.defineEventHandler)
vi.stubGlobal('getQuery', () => mockQuery)

const { default: handler } = await import('../../server/api/search.get')

const event = {} as Parameters<typeof handler>[0]

function activity(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title_i18n: { es: id },
    price: null,
    is_free: false,
    stroller_friendly: false,
    images: null,
    created_at: '2026-01-01',
    metadata: null,
    category_id: 'cat-park',
    place: {
      id: 'place-1',
      name_i18n: { es: 'Lugar' },
      images: null,
      created_at: '2026-01-01',
      metadata: null,
      city: null,
    },
    age_ranges: [{ age_range: { min_months: 36, max_months: 71 } }],
    ...overrides,
  }
}

beforeEach(() => {
  mockQuery = {}
  mockDataset = {
    activities: [
      activity('museo', { created_at: '2026-03-01' }),
      activity('parque', {
        is_free: true,
        stroller_friendly: true,
        created_at: '2026-02-01',
        place: {
          id: 'place-2',
          name_i18n: { es: 'Parque' },
          images: null,
          created_at: '2026-01-01',
          metadata: { opening_hours_text: ['viernes: 9:00–17:00'] },
          city: null,
        },
      }),
    ],
    places: [],
    categories: [
      { id: 'cat-outdoor', slug: 'aire-libre', parent_id: null },
      { id: 'cat-park', slug: 'parque', parent_id: 'cat-outdoor' },
    ],
  }
})

describe('GET /api/search', () => {
  it('returns the first page with facets, the upcoming occasion and today', async () => {
    const response = await handler(event)
    expect(response).toMatchObject({
      total: 2,
      page: 1,
      pageCount: 1,
      facets: { total: 2, categories: { parque: 2, 'aire-libre': 2 } },
      occasion: { key: 'hanukkah' },
      today: '2026-11-20',
    })
    expect(response.items.map(({ id }) => id)).toEqual(['museo', 'parque'])
    expect(response.items[0]).toMatchObject({ kind: 'activity', fit: 'all', matchingAges: [] })
  })

  it('applies the validated query params', async () => {
    mockQuery = { free: 'true', ages: '4', category: 'aire-libre' }
    const response = await handler(event)
    expect(response.items.map(({ id }) => id)).toEqual(['parque'])
    expect(response.items[0]?.matchingAges).toEqual([4])
  })

  it('ignores invalid params instead of failing', async () => {
    mockQuery = { page: 'abc', when: 'someday', ages: '99' }
    await expect(handler(event)).resolves.toMatchObject({ total: 2, page: 1 })
  })

  it('filters by an occasion range', async () => {
    mockDataset.activities[0] = activity('museo', {
      metadata: { opening_hours_text: [] },
      place: {
        id: 'place-1',
        name_i18n: {},
        images: null,
        created_at: '2026-01-01',
        metadata: {
          opening_hours_text: [
            'domingo: Cerrado',
            'lunes: Cerrado',
            'martes: Cerrado',
            'miércoles: Cerrado',
            'jueves: Cerrado',
            'viernes: Cerrado',
            'sábado: Cerrado',
          ],
        },
        city: null,
      },
    })
    mockQuery = { when: 'occasion:hanukkah' }
    const response = await handler(event)
    expect(response.items.map(({ id }) => id)).toEqual(['parque'])
  })

  it('filters by kind, amenities and open now and reports their facets', async () => {
    mockQuery = { amenities: 'stroller', open: 'now', kind: 'activity' }
    const response = await handler(event)
    expect(response.items.map(({ id }) => id)).toEqual(['parque'])
    expect(response.facets).toMatchObject({
      kinds: { activity: 1, place: 0 },
      amenities: { stroller: 1, shade: 0 },
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SearchDataset } from '../../server/utils/search-records'

let today = '2026-11-12'
let occasions: { key: string; name: Record<string, string>; startsOn: string; endsOn: string }[] =
  []
let dataset: SearchDataset

vi.mock('../../server/utils/search-dataset', () => ({
  getSearchDataset: vi.fn(async () => dataset),
  getUpcomingOccasions: vi.fn(async () => occasions),
}))
vi.mock('@mundopekes/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mundopekes/core')>()),
  todayIn: () => today,
}))

const h3 = await import('h3')
vi.stubGlobal('defineEventHandler', h3.defineEventHandler)

const { default: handler } = await import('../../server/api/home.get')
const event = {} as Parameters<typeof handler>[0]

function activity(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title_i18n: { es: id },
    price: 30,
    is_free: false,
    stroller_friendly: false,
    images: null,
    created_at: `2026-01-${id.padStart(2, '0')}`,
    metadata: null,
    category_id: 'cat-park',
    place: {
      id: 'p',
      lat: 32,
      lng: 34.8,
      name_i18n: {},
      images: null,
      created_at: '',
      metadata: null,
      city: null,
    },
    age_ranges: [],
    ...overrides,
  }
}

beforeEach(() => {
  today = '2026-11-12'
  occasions = []
  dataset = {
    activities: [
      ...['1', '2', '3', '4', '5'].map((id) => activity(id)),
      ...['6', '7', '8'].map((id) => activity(id, { is_free: true, category_id: 'cat-museum' })),
    ],
    places: [],
    categories: [
      { id: 'cat-outdoor', slug: 'aire-libre', parent_id: null },
      { id: 'cat-park', slug: 'parque', parent_id: 'cat-outdoor' },
      { id: 'cat-culture', slug: 'cultura', parent_id: null },
      { id: 'cat-museum', slug: 'museos', parent_id: 'cat-culture' },
    ],
  }
})

describe('GET /api/home', () => {
  it('builds the Shabbat section on Thursdays with a link to the full results', async () => {
    const home = await handler(event)
    expect(home.context).toMatchObject({ kind: 'shabat', total: 8, query: { when: 'shabat' } })
    expect(home.context?.items).toHaveLength(8)
  })

  it('switches to an occasion that starts within a week', async () => {
    occasions = [
      { key: 'hanukkah', name: { es: 'Janucá' }, startsOn: '2026-12-05', endsOn: '2026-12-12' },
    ]
    today = '2026-12-01'
    const home = await handler(event)
    expect(home.context).toMatchObject({ kind: 'occasion', query: { when: 'occasion:hanukkah' } })
    expect(home.occasion?.key).toBe('hanukkah')
  })

  it('only returns carousels with at least four plans', async () => {
    const home = await handler(event)
    expect(home.free).toBeNull()
    expect(home.categories.map(({ slug, total }) => [slug, total])).toEqual([['aire-libre', 5]])
    expect(home.categoryCounts).toEqual({ 'aire-libre': 5, cultura: 3 })
  })

  it('returns the free section once there are enough free plans', async () => {
    dataset.activities.push(activity('9', { is_free: true }))
    const home = await handler(event)
    expect(home.free).toMatchObject({ total: 4, query: { free: 'true' } })
  })
})

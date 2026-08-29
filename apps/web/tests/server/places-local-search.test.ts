import { describe, it, expect, vi, beforeEach } from 'vitest'
import { normalizeName } from '../../../../layers/domain/server/utils/duplicate-detection'

// ── h3 mocks ───────────────────────────────────────────────────────────────
let mockQuery: Record<string, unknown> = {}

vi.mock('h3', async (importOriginal) => {
  const h3 = await importOriginal<typeof import('h3')>()
  const createH3Error = (input: unknown): InstanceType<typeof h3.H3Error> => {
    if (input instanceof h3.H3Error) return input
    const msg =
      typeof input === 'string'
        ? input
        : ((input as Record<string, string>)?.statusMessage ??
          (input as Record<string, string>)?.message ??
          'An error occurred')
    const err = new h3.H3Error(msg)
    if (input && typeof input === 'object') Object.assign(err, input)
    return err
  }
  return { ...h3, createH3Error }
})

// ── Supabase mock ──────────────────────────────────────────────────────────
// Mirrors the real Postgrest builder: every filter method returns the same
// chainable object (select/eq/ilike/limit can be called in any order/count),
// and awaiting it at any point resolves via `.then()` — matching how the
// route calls `.limit(8)` and then optionally `.eq('city_id', ...)` after.
let resolvedValue: { data: unknown; error: unknown } = { data: [], error: null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockChain: any = {}
mockChain.select = vi.fn(() => mockChain)
mockChain.eq = vi.fn(() => mockChain)
mockChain.ilike = vi.fn(() => mockChain)
mockChain.limit = vi.fn(() => mockChain)
mockChain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
  Promise.resolve(resolvedValue).then(resolve, reject)

const mockFrom = vi.fn(() => mockChain)

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(async () => ({ from: mockFrom })),
}))

// ── Global stubs ───────────────────────────────────────────────────────────
const h3 = await import('h3')
vi.stubGlobal('defineEventHandler', h3.defineEventHandler)
vi.stubGlobal('createError', h3.createError)
vi.stubGlobal('getQuery', () => mockQuery)
const mockCheckRateLimit = vi.fn().mockResolvedValue(undefined)
vi.stubGlobal('checkRateLimit', mockCheckRateLimit)
vi.stubGlobal('logError', vi.fn().mockResolvedValue(undefined))
vi.stubGlobal('normalizeName', normalizeName)

// ── Load handler ───────────────────────────────────────────────────────────
const { default: handler } = await import('../../server/api/places/local-search.get')

function makeEvent() {
  return {} as Parameters<typeof handler>[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCheckRateLimit.mockResolvedValue(undefined)
  mockQuery = {}
  resolvedValue = {
    data: [
      {
        id: 'place-001',
        name_i18n: { es: 'Parque HaYarkon' },
        lat: 32.1,
        lng: 34.8,
        images: ['/img/park.jpg'],
        google_place_id: 'gp-001',
        city: { id: 1, name: 'Tel Aviv' },
      },
    ],
    error: null,
  }
})

describe('GET /api/places/local-search', () => {
  it('returns an empty list for a query shorter than 2 chars', async () => {
    mockQuery = { q: 'a' }
    const result = await handler(makeEvent())
    expect(result).toEqual({ places: [] })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('queries only active places, ilike on name_normalized', async () => {
    mockQuery = { q: 'Hayarkon' }
    await handler(makeEvent())
    expect(mockFrom).toHaveBeenCalledWith('places')
    expect(mockChain.eq).toHaveBeenCalledWith('status', 'active')
    expect(mockChain.ilike).toHaveBeenCalledWith(
      'name_normalized',
      expect.stringContaining('hayarkon')
    )
  })

  it('scopes by city_id when provided', async () => {
    mockQuery = { q: 'Hayarkon', city_id: '3' }
    await handler(makeEvent())
    expect(mockChain.eq).toHaveBeenCalledWith('city_id', 3)
  })

  it('maps rows into the LocalPlaceSearchResult shape', async () => {
    mockQuery = { q: 'Hayarkon' }
    const result = await handler(makeEvent())
    expect(result.places).toEqual([
      {
        id: 'place-001',
        name_i18n: { es: 'Parque HaYarkon' },
        lat: 32.1,
        lng: 34.8,
        thumbnail: '/img/park.jpg',
        google_place_id: 'gp-001',
        city: { id: 1, name: 'Tel Aviv' },
      },
    ])
  })

  it('thumbnail is null when the place has no images', async () => {
    mockQuery = { q: 'Hayarkon' }
    resolvedValue = {
      data: [
        {
          id: 'place-002',
          name_i18n: { es: 'Sin fotos' },
          lat: null,
          lng: null,
          images: null,
          google_place_id: null,
          city: null,
        },
      ],
      error: null,
    }
    const result = await handler(makeEvent())
    expect(result.places[0]?.thumbnail).toBeNull()
    expect(result.places[0]?.city).toBeNull()
  })

  it('throws 500 on a Supabase error', async () => {
    mockQuery = { q: 'Hayarkon' }
    resolvedValue = { data: null, error: { message: 'db down' } }
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 500 })
  })

  it('applies rate limiting', async () => {
    mockQuery = { q: 'Hayarkon' }
    await handler(makeEvent())
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.anything(),
      'places/local-search',
      expect.objectContaining({ limit: 30, windowSeconds: 60 })
    )
  })
})

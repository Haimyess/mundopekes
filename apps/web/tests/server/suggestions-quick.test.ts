import { beforeEach, describe, expect, it, vi } from 'vitest'

let body: Record<string, unknown> = {}
let isHuman = true
const mockInsert = vi.fn()
const mockFindPlaceDuplicates = vi.fn()
const { mockSetStatus } = vi.hoisted(() => ({ mockSetStatus: vi.fn() }))

vi.mock('h3', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setResponseStatus: mockSetStatus,
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(async () => ({ from: () => ({ insert: mockInsert }) })),
}))

const h3 = await import('h3')
vi.stubGlobal('defineEventHandler', h3.defineEventHandler)
vi.stubGlobal('createError', h3.createError)
vi.stubGlobal('readBody', async () => body)
vi.stubGlobal('checkRateLimit', vi.fn().mockResolvedValue(undefined))
vi.stubGlobal('logInfo', vi.fn().mockResolvedValue(undefined))
vi.stubGlobal('logError', vi.fn().mockResolvedValue(undefined))
vi.stubGlobal(
  'verifyTurnstileToken',
  vi.fn(async () => isHuman)
)
vi.stubGlobal(
  'resolveGooglePlaceId',
  vi.fn(async (link?: string) => (link?.includes('maps') ? 'ChIJplace' : null))
)
vi.stubGlobal('findPlaceDuplicates', mockFindPlaceDuplicates)
vi.stubGlobal('findExperienceDuplicates', vi.fn())

const quick = await import('../../server/utils/quick-suggestion')
vi.stubGlobal('createQuickSuggestion', quick.createQuickSuggestion)
const { default: handler } = await import('../../server/api/suggestions/index.post')
const event = {} as Parameters<typeof handler>[0]

const VALID = {
  source: 'quick',
  name: 'Granja Los Olivos',
  where: 'Ramat HaSharon',
  link: 'https://www.google.com/maps/place/?q=place_id:ChIJplace',
  why: 'Tienen cabras',
  locale: 'es',
  origin: 'home',
  turnstileToken: 'token',
}

beforeEach(() => {
  body = { ...VALID }
  isHuman = true
  mockInsert.mockReset().mockResolvedValue({ error: null })
  mockFindPlaceDuplicates.mockReset().mockResolvedValue([])
  mockSetStatus.mockReset()
})

describe('POST /api/suggestions with source quick', () => {
  it('stores the quick suggestion as the design describes and answers 201', async () => {
    await expect(handler(event)).resolves.toEqual({ ok: true })
    expect(mockSetStatus).toHaveBeenCalledWith(event, 201)
    expect(mockFindPlaceDuplicates).toHaveBeenCalledWith(expect.anything(), {
      name: 'Granja Los Olivos',
      googlePlaceId: 'ChIJplace',
    })
    expect(mockInsert.mock.calls[0]![0]).toMatchObject({
      suggestion_type: 'new_place_with_experience',
      status: 'pending',
      name_i18n: { es: 'Granja Los Olivos' },
      location: { city: 'Ramat HaSharon' },
      flagged_possible_duplicate: false,
      metadata: {
        source: 'quick',
        origin: 'home',
        where: 'Ramat HaSharon',
        link: VALID.link,
        why: 'Tienen cabras',
        locale: 'es',
        google_place_id: 'ChIJplace',
      },
    })
  })

  it('flags a possible duplicate without blocking the submission', async () => {
    mockFindPlaceDuplicates.mockResolvedValue([{ id: 'place-1', confidence: 'high' }])
    await expect(handler(event)).resolves.toEqual({ ok: true })
    expect(mockInsert.mock.calls[0]![0]).toMatchObject({
      flagged_possible_duplicate: true,
      possible_duplicate_of: 'place-1',
    })
  })

  it('rejects invalid bodies before verifying the token', async () => {
    body = { ...VALID, name: 'x' }
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects submissions that fail the anti-bot check', async () => {
    isHuman = false
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('reports a database failure', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'boom' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 500 })
  })
})

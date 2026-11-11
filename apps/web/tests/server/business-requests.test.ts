import { beforeEach, describe, expect, it, vi } from 'vitest'

const PLACE_ID = '7b0c3f5e-9a55-4c63-8a51-3f8f7c1c2d4e'

let body: Record<string, unknown> = {}
let isHuman = true
let pendingClaims = 0
const mockInsert = vi.fn()
const mockCountFilters = vi.fn()
const { mockSetStatus, mockDataset } = vi.hoisted(() => ({
  mockSetStatus: vi.fn(),
  mockDataset: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setResponseStatus: mockSetStatus,
}))

function countQuery() {
  const query = {
    eq: (column: string, value: unknown) => {
      mockCountFilters(column, value)
      return query
    },
    then: (resolve: (value: { count: number }) => void) => resolve({ count: pendingClaims }),
  }
  return query
}

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(() => ({
    from: () => ({ insert: mockInsert, select: () => countQuery() }),
  })),
}))

vi.mock('../../server/utils/search-dataset', () => ({ getSearchDataset: mockDataset }))

const h3 = await import('h3')
vi.stubGlobal('defineEventHandler', h3.defineEventHandler)
vi.stubGlobal('createError', h3.createError)
vi.stubGlobal('readBody', async () => body)
const mockRateLimit = vi.fn().mockResolvedValue(undefined)
vi.stubGlobal('checkRateLimit', mockRateLimit)
vi.stubGlobal('logInfo', vi.fn().mockResolvedValue(undefined))
const mockLogError = vi.fn().mockResolvedValue(undefined)
vi.stubGlobal('logError', mockLogError)
vi.stubGlobal(
  'verifyTurnstileToken',
  vi.fn(async () => isHuman)
)

const util = await import('../../server/utils/business-request')
vi.stubGlobal('createBusinessRequest', util.createBusinessRequest)
const { default: handler } = await import('../../server/api/business-requests/index.post')
const event = {} as Parameters<typeof handler>[0]

const JOIN = {
  kind: 'join',
  businessName: 'Taller Barro y Color',
  activityType: 'Taller',
  city: 'Tel Aviv',
  phone: '+972 50 123 4567',
  locale: 'es',
  turnstileToken: 'token',
}

const CLAIM = {
  kind: 'claim',
  placeId: PLACE_ID,
  role: 'manager',
  name: 'Dana Levi',
  email: 'Dana@Museo.co.il',
  phone: '03-123-4567',
  acceptTerms: true,
  locale: 'en',
  turnstileToken: 'token',
}

const rejection = async () => {
  try {
    await handler(event)
  } catch (error) {
    return error as { statusCode: number }
  }
  throw new Error('expected the request to fail')
}

beforeEach(() => {
  body = { ...JOIN }
  isHuman = true
  pendingClaims = 0
  mockInsert.mockReset().mockResolvedValue({ error: null })
  mockCountFilters.mockReset()
  mockSetStatus.mockReset()
  mockLogError.mockClear()
  mockRateLimit.mockClear()
  mockDataset.mockReset().mockResolvedValue({
    places: [{ id: PLACE_ID, name_i18n: { he: 'מוזיאון המדע', en: 'Science Museum' } }],
  })
})

describe('POST /api/business-requests', () => {
  it('rate limits before reading the request', async () => {
    await handler(event)
    expect(mockRateLimit).toHaveBeenCalledWith(event, 'business-requests/create', {
      limit: 3,
      windowSeconds: 3600,
    })
  })

  it('stores a join request and answers 201', async () => {
    await expect(handler(event)).resolves.toEqual({ ok: true })
    expect(mockSetStatus).toHaveBeenCalledWith(event, 201)
    expect(mockInsert).toHaveBeenCalledWith({
      kind: 'join',
      business_name: 'Taller Barro y Color',
      activity_type: 'Taller',
      city: 'Tel Aviv',
      phone: '+972 50 123 4567',
      locale: 'es',
    })
  })

  it('stores a claim with the place name in the sender language', async () => {
    body = { ...CLAIM }
    await expect(handler(event)).resolves.toEqual({ ok: true })
    expect(mockInsert.mock.calls[0]![0]).toMatchObject({
      kind: 'claim',
      place_id: PLACE_ID,
      business_name: 'Science Museum',
      contact_name: 'Dana Levi',
      role: 'manager',
      email: 'dana@museo.co.il',
      locale: 'en',
      accepted_terms_at: expect.any(String),
    })
  })

  it('answers 404 when the claimed place is not listed', async () => {
    body = { ...CLAIM, placeId: '00000000-0000-4000-8000-000000000000' }
    expect((await rejection()).statusCode).toBe(404)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('does not store the same pending claim twice', async () => {
    body = { ...CLAIM }
    pendingClaims = 1
    await expect(handler(event)).resolves.toEqual({ ok: true })
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockCountFilters).toHaveBeenCalledWith('email', 'dana@museo.co.il')
  })

  it('answers 400 for invalid data without storing it', async () => {
    body = { ...JOIN, phone: 'call me' }
    expect((await rejection()).statusCode).toBe(400)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('answers 403 when the verification fails', async () => {
    isHuman = false
    expect((await rejection()).statusCode).toBe(403)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('answers 500 and logs when the database rejects the row', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'boom' } })
    expect((await rejection()).statusCode).toBe(500)
    expect(mockLogError).toHaveBeenCalled()
  })
})

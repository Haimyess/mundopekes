import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── h3 mocks ───────────────────────────────────────────────────────────────
const mockReadBody = vi.fn()

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
  return { ...h3, createH3Error, readBody: mockReadBody }
})

// ── Supabase mock ──────────────────────────────────────────────────────────
const mockInsertData = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn(() => ({ select: mockSelect }))

// `places` lookup chain used by the experience_for_existing_place branch:
// client.from('places').select('id').eq('id', ...).eq('status', 'active').single()
const mockPlacesSingle = vi.fn()
const mockPlacesChain = {
  select: vi.fn(() => mockPlacesChain),
  eq: vi.fn(() => mockPlacesChain),
  single: mockPlacesSingle,
}

const mockFrom = vi.fn((table: string) => {
  if (table === 'places') return mockPlacesChain
  return { insert: mockInsert }
})

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(async () => ({ from: mockFrom })),
}))

// ── Logger mock ────────────────────────────────────────────────────────────
vi.mock('~/server/utils/logger', () => ({
  logInfo: vi.fn().mockResolvedValue(undefined),
  logError: vi.fn().mockResolvedValue(undefined),
}))

// ── Global stubs ───────────────────────────────────────────────────────────
const h3 = await import('h3')
vi.stubGlobal('defineEventHandler', h3.defineEventHandler)
vi.stubGlobal('createError', h3.createError)
vi.stubGlobal('readBody', mockReadBody)
vi.stubGlobal('sanitizeHttpUrl', (value: string | null | undefined) => {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null
  } catch {
    return null
  }
})
vi.stubGlobal('checkRateLimit', vi.fn().mockResolvedValue(undefined))
const mockFindPlaceDuplicates = vi.fn().mockResolvedValue([])
const mockFindExperienceDuplicates = vi.fn().mockResolvedValue([])
vi.stubGlobal('findPlaceDuplicates', mockFindPlaceDuplicates)
vi.stubGlobal('findExperienceDuplicates', mockFindExperienceDuplicates)

// ── Load handler ───────────────────────────────────────────────────────────
const { default: handler } = await import('../../server/api/suggestions/index.post')

// ── Base valid body ────────────────────────────────────────────────────────
const baseBody = () => ({
  suggestion_type: 'new_place_with_experience' as const,
  name_i18n: { es: 'Parque HaYarkon' },
  location: { city: 'Tel Aviv', address: 'Sderot Rokach', lat: 32.1, lng: 34.8 },
  category_id: 'cat-001',
  age_range_ids: [1, 2],
  best_season: ['spring'],
  type: ['Parques'],
  is_free: true,
  stroller_friendly: false,
  has_shadow: false,
  has_bathrooms: false,
  open_weekends: true,
  schedule_structured: undefined,
  title_i18n: { es: 'Juegos en Parque HaYarkon' },
  metadata: {
    google_place_id: 'gp-001',
    phone: '+972-3-123',
    website: 'https://park.il',
    opening_hours_text: ['Lunes: 8am–6pm'],
  },
})

function makeEvent(body: unknown) {
  mockReadBody.mockResolvedValue(body)
  return {} as Parameters<typeof handler>[0]
}

function mockInsertSuccess(returnData = { id: 'sug-001' }) {
  mockSelect.mockReturnValue({ single: mockSingle })
  mockSingle.mockResolvedValue({ data: returnData, error: null })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockInsert.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ single: mockSingle })
  mockSingle.mockResolvedValue({ data: { id: 'sug-001' }, error: null })
  mockFrom.mockImplementation((table: string) =>
    table === 'places' ? mockPlacesChain : { insert: mockInsert }
  )
  mockPlacesSingle.mockResolvedValue({
    data: { id: '11111111-1111-4111-8111-111111111111' },
    error: null,
  })
  mockFindPlaceDuplicates.mockResolvedValue([])
  mockFindExperienceDuplicates.mockResolvedValue([])
})

// ═══════════════════════════════════════════════════════════════════════════
//  Validation
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/suggestions — validation', () => {
  it('throws 400 when name_i18n is empty', async () => {
    await expect(handler(makeEvent({ ...baseBody(), name_i18n: {} }))).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('throws 400 when name_i18n is missing', async () => {
    const { name_i18n: _n, ...noName } = baseBody()
    await expect(handler(makeEvent(noName))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when location city and address are both empty', async () => {
    await expect(
      handler(makeEvent({ ...baseBody(), location: { city: '', address: '' } }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('succeeds when only address is provided (city empty)', async () => {
    mockInsertSuccess()
    const body = { ...baseBody(), location: { city: '', address: 'Sderot Rokach' } }
    await expect(handler(makeEvent(body))).resolves.toMatchObject({ success: true })
  })

  it('succeeds when only city is provided (address empty)', async () => {
    mockInsertSuccess()
    const body = { ...baseBody(), location: { city: 'Tel Aviv', address: '' } }
    await expect(handler(makeEvent(body))).resolves.toMatchObject({ success: true })
  })

  it('throws 400 when category_id is missing', async () => {
    await expect(handler(makeEvent({ ...baseBody(), category_id: '' }))).rejects.toMatchObject({
      statusCode: 400,
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  Payload persistence
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/suggestions — payload persistence', () => {
  it('persists title_i18n in metadata', async () => {
    mockInsertSuccess()
    await handler(makeEvent(baseBody()))
    const insertedRow = mockInsert.mock.calls[0][0]
    expect(insertedRow.metadata.title_i18n).toEqual({ es: 'Juegos en Parque HaYarkon' })
  })

  it('hours_unknown=true → schedule_structured null in metadata', async () => {
    mockInsertSuccess()
    const body = {
      ...baseBody(),
      schedule_structured: undefined,
      metadata: { ...baseBody().metadata, hours_unknown: true },
    }
    await handler(makeEvent(body))
    const insertedRow = mockInsert.mock.calls[0][0]
    expect(insertedRow.metadata.hours_unknown).toBe(true)
    expect(insertedRow.metadata.schedule_structured).toBeNull()
  })

  it('hours_unknown=false → schedule_structured preserved', async () => {
    mockInsertSuccess()
    const schedule = {
      monday: { open: true, start: '09:00', end: '17:00' },
      tuesday: { open: true, start: '09:00', end: '17:00' },
      wednesday: { open: false, start: '09:00', end: '17:00' },
      thursday: { open: true, start: '09:00', end: '17:00' },
      friday: { open: false, start: '09:00', end: '14:00' },
      saturday: { open: false, start: '10:00', end: '16:00' },
      sunday: { open: false, start: '09:00', end: '17:00' },
    }
    const body = {
      ...baseBody(),
      schedule_structured: schedule,
      metadata: { ...baseBody().metadata, hours_unknown: false },
    }
    await handler(makeEvent(body))
    const insertedRow = mockInsert.mock.calls[0][0]
    expect(insertedRow.metadata.schedule_structured).toEqual(schedule)
  })

  it('does not lose phone/website/opening_hours_text from metadata', async () => {
    mockInsertSuccess()
    await handler(makeEvent(baseBody()))
    const insertedRow = mockInsert.mock.calls[0][0]
    expect(insertedRow.metadata.phone).toBe('+972-3-123')
    expect(insertedRow.metadata.website).toBe('https://park.il')
    expect(insertedRow.metadata.opening_hours_text).toEqual(['Lunes: 8am–6pm'])
  })

  it('is_free=true → price stored as null in metadata', async () => {
    mockInsertSuccess()
    const body = { ...baseBody(), is_free: true }
    await handler(makeEvent(body))
    const insertedRow = mockInsert.mock.calls[0][0]
    expect(insertedRow.metadata.price).toBeNull()
  })

  it('is_free=false → price stored from payload', async () => {
    mockInsertSuccess()
    const body = { ...baseBody(), is_free: false, price: 50 }
    await handler(makeEvent(body))
    const insertedRow = mockInsert.mock.calls[0][0]
    expect(insertedRow.metadata.price).toBe(50)
  })

  it('inserts google_place_id from metadata', async () => {
    mockInsertSuccess()
    await handler(makeEvent(baseBody()))
    const insertedRow = mockInsert.mock.calls[0][0]
    expect(insertedRow.metadata.google_place_id).toBe('gp-001')
  })
})

describe('POST /api/suggestions — schedule text', () => {
  it('generates human-readable schedule text from schedule_structured', async () => {
    mockInsertSuccess()
    const body = {
      ...baseBody(),
      schedule_structured: {
        monday: { open: true, start: '09:00', end: '17:00' },
        tuesday: { open: false, start: '09:00', end: '17:00' },
        wednesday: { open: false, start: '09:00', end: '17:00' },
        thursday: { open: false, start: '09:00', end: '17:00' },
        friday: { open: false, start: '09:00', end: '14:00' },
        saturday: { open: false, start: '10:00', end: '16:00' },
        sunday: { open: false, start: '09:00', end: '17:00' },
      },
      metadata: { ...baseBody().metadata, hours_unknown: false },
    }
    await handler(makeEvent(body))
    const insertedRow = mockInsert.mock.calls[0][0]
    expect(insertedRow.schedule).toContain('Lunes')
    expect(insertedRow.schedule).toContain('09:00')
  })

  it('schedule is empty string when hours_unknown=true', async () => {
    mockInsertSuccess()
    const body = {
      ...baseBody(),
      schedule_structured: undefined,
      metadata: { ...baseBody().metadata, hours_unknown: true },
    }
    await handler(makeEvent(body))
    const insertedRow = mockInsert.mock.calls[0][0]
    expect(insertedRow.schedule).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  experience_for_existing_place branch
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/suggestions — experience_for_existing_place', () => {
  const existingPlaceBody = () => ({
    suggestion_type: 'experience_for_existing_place' as const,
    place_id: '11111111-1111-4111-8111-111111111111',
    title_i18n: { es: 'Toboganes' },
    category_id: 'cat-001',
    age_range_ids: [1, 2],
    best_season: ['spring'],
    type: ['Parques'],
    is_free: true,
    stroller_friendly: false,
    has_shadow: false,
    has_bathrooms: false,
    open_weekends: true,
    schedule_structured: undefined,
    metadata: {},
  })

  it('inserts only an activity-shaped suggestion with no place_id lookup fields', async () => {
    mockInsertSuccess()
    await handler(makeEvent(existingPlaceBody()))
    const insertedRow = mockInsert.mock.calls[0][0]
    expect(insertedRow.suggestion_type).toBe('experience_for_existing_place')
    expect(insertedRow.place_id).toBe('11111111-1111-4111-8111-111111111111')
    expect(insertedRow.location).toBeNull()
    expect(insertedRow.name_i18n).toEqual({})
  })

  it('checks the place exists and is active before inserting', async () => {
    mockInsertSuccess()
    await handler(makeEvent(existingPlaceBody()))
    expect(mockFrom).toHaveBeenCalledWith('places')
    expect(mockPlacesChain.eq).toHaveBeenCalledWith('id', '11111111-1111-4111-8111-111111111111')
    expect(mockPlacesChain.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('throws 400 when the place_id does not exist or is inactive', async () => {
    mockPlacesSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
    await expect(handler(makeEvent(existingPlaceBody()))).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('throws 400 when place_id is not a valid uuid', async () => {
    await expect(
      handler(makeEvent({ ...existingPlaceBody(), place_id: 'not-a-uuid' }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when title_i18n is missing', async () => {
    const { title_i18n: _t, ...noTitle } = existingPlaceBody()
    await expect(handler(makeEvent(noTitle))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('flags flagged_possible_duplicate when a matching activity is found', async () => {
    mockInsertSuccess()
    mockFindExperienceDuplicates.mockResolvedValueOnce([
      { id: 'act-existing', title: 'Toboganes', confidence: 'high', reason: 'exact_title' },
    ])
    await handler(makeEvent(existingPlaceBody()))
    const insertedRow = mockInsert.mock.calls[0][0]
    expect(insertedRow.flagged_possible_duplicate).toBe(true)
    expect(insertedRow.possible_duplicate_activity_id).toBe('act-existing')
  })
})

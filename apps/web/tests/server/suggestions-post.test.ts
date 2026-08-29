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
// insert(rows).select() resolves directly (no .single() — a submission can
// insert several suggestion rows at once).
const mockSelect = vi.fn()
const mockInsert = vi.fn(() => ({ select: mockSelect }))

// `places` lookup chain used when the place already exists:
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

// ── Base valid bodies ────────────────────────────────────────────────────────
const newActivity = (overrides = {}) => ({
  mode: 'new' as const,
  title_i18n: { es: 'Juegos en Parque HaYarkon' },
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
  ...overrides,
})

const baseBody = () => ({
  place: {
    mode: 'new' as const,
    name_i18n: { es: 'Parque HaYarkon' },
    location: { city: 'Tel Aviv', address: 'Sderot Rokach', lat: 32.1, lng: 34.8 },
    metadata: {
      google_place_id: 'gp-001',
      phone: '+972-3-123',
      website: 'https://park.il',
      opening_hours_text: ['Lunes: 8am–6pm'],
    },
  },
  activities: [newActivity()],
  locale: 'es',
})

function makeEvent(body: unknown) {
  mockReadBody.mockResolvedValue(body)
  return {} as Parameters<typeof handler>[0]
}

function mockInsertSuccess(returnData: Record<string, unknown>[] = [{ id: 'sug-001' }]) {
  mockSelect.mockResolvedValue({ data: returnData, error: null })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockInsert.mockReturnValue({ select: mockSelect })
  mockSelect.mockResolvedValue({ data: [{ id: 'sug-001' }], error: null })
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
  it('throws 400 when place.name_i18n is empty', async () => {
    const body = baseBody()
    body.place.name_i18n = {}
    await expect(handler(makeEvent(body))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when location city and address are both empty', async () => {
    const body = baseBody()
    body.place.location = { city: '', address: '', lat: undefined, lng: undefined }
    await expect(handler(makeEvent(body))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('succeeds when only address is provided (city empty)', async () => {
    mockInsertSuccess()
    const body = baseBody()
    body.place.location = { city: '', address: 'Sderot Rokach', lat: undefined, lng: undefined }
    await expect(handler(makeEvent(body))).resolves.toMatchObject({ success: true })
  })

  it('throws 400 when category_id is missing on a new activity', async () => {
    const body = { ...baseBody(), activities: [newActivity({ category_id: '' })] }
    await expect(handler(makeEvent(body))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when there are no new activities at all', async () => {
    const body = {
      ...baseBody(),
      activities: [
        { mode: 'existing' as const, activity_id: '22222222-2222-4222-8222-222222222222' },
      ],
    }
    await expect(handler(makeEvent(body))).rejects.toMatchObject({ statusCode: 400 })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  Payload persistence — new place, single activity
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/suggestions — payload persistence', () => {
  it('persists title_i18n in metadata', async () => {
    mockInsertSuccess()
    await handler(makeEvent(baseBody()))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].metadata.title_i18n).toEqual({ es: 'Juegos en Parque HaYarkon' })
  })

  it('hours_unknown=true → schedule_structured null in metadata', async () => {
    mockInsertSuccess()
    const body = {
      ...baseBody(),
      activities: [newActivity({ metadata: { hours_unknown: true } })],
    }
    await handler(makeEvent(body))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].metadata.hours_unknown).toBe(true)
    expect(rows[0].metadata.schedule_structured).toBeNull()
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
      activities: [
        newActivity({ schedule_structured: schedule, metadata: { hours_unknown: false } }),
      ],
    }
    await handler(makeEvent(body))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].metadata.schedule_structured).toEqual(schedule)
  })

  it('is_free=true → price stored as null in metadata', async () => {
    mockInsertSuccess()
    await handler(makeEvent(baseBody()))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].metadata.price).toBeNull()
  })

  it('is_free=false → price stored from payload', async () => {
    mockInsertSuccess()
    const body = { ...baseBody(), activities: [newActivity({ is_free: false, price: 50 })] }
    await handler(makeEvent(body))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].metadata.price).toBe(50)
  })

  it('is_free=false and price=0 → price stored as 0, not dropped', async () => {
    mockInsertSuccess()
    const body = { ...baseBody(), activities: [newActivity({ is_free: false, price: 0 })] }
    await handler(makeEvent(body))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].metadata.price).toBe(0)
  })

  it('inserts google_place_id from place metadata onto the primary row', async () => {
    mockInsertSuccess()
    await handler(makeEvent(baseBody()))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].metadata.google_place_id).toBe('gp-001')
    expect(rows[0].is_primary).toBe(true)
  })
})

describe('POST /api/suggestions — schedule text', () => {
  it('generates human-readable schedule text in the submitter locale', async () => {
    mockInsertSuccess()
    const body = {
      ...baseBody(),
      locale: 'en',
      activities: [
        newActivity({
          schedule_structured: {
            monday: { open: true, start: '09:00', end: '17:00' },
            tuesday: { open: false, start: '09:00', end: '17:00' },
            wednesday: { open: false, start: '09:00', end: '17:00' },
            thursday: { open: false, start: '09:00', end: '17:00' },
            friday: { open: false, start: '09:00', end: '14:00' },
            saturday: { open: false, start: '10:00', end: '16:00' },
            sunday: { open: false, start: '09:00', end: '17:00' },
          },
          metadata: { hours_unknown: false },
        }),
      ],
    }
    await handler(makeEvent(body))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].schedule).toContain('Monday')
    expect(rows[0].schedule).toContain('09:00')
  })

  it('falls back to Spanish day names for an unknown locale', async () => {
    mockInsertSuccess()
    const body = {
      ...baseBody(),
      locale: 'fr',
      activities: [
        newActivity({
          schedule_structured: {
            monday: { open: true, start: '09:00', end: '17:00' },
            tuesday: { open: false, start: '09:00', end: '17:00' },
            wednesday: { open: false, start: '09:00', end: '17:00' },
            thursday: { open: false, start: '09:00', end: '17:00' },
            friday: { open: false, start: '09:00', end: '14:00' },
            saturday: { open: false, start: '10:00', end: '16:00' },
            sunday: { open: false, start: '09:00', end: '17:00' },
          },
          metadata: { hours_unknown: false },
        }),
      ],
    }
    await handler(makeEvent(body))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].schedule).toContain('Lunes')
  })

  it('schedule is empty string when hours_unknown=true', async () => {
    mockInsertSuccess()
    const body = { ...baseBody(), activities: [newActivity({ metadata: { hours_unknown: true } })] }
    await handler(makeEvent(body))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].schedule).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  Multiple activities for a new place
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/suggestions — new place with multiple activities', () => {
  it('inserts one row per new activity, sharing a suggestion_group_id', async () => {
    mockInsertSuccess()
    const body = {
      ...baseBody(),
      activities: [
        newActivity({ title_i18n: { es: 'Toboganes' } }),
        newActivity({ title_i18n: { es: 'Hamacas' } }),
      ],
    }
    await handler(makeEvent(body))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows).toHaveLength(2)
    expect(rows[0].suggestion_group_id).toBeTruthy()
    expect(rows[0].suggestion_group_id).toBe(rows[1].suggestion_group_id)
  })

  it('only the first (primary) row carries the place fields', async () => {
    mockInsertSuccess()
    const body = {
      ...baseBody(),
      activities: [
        newActivity({ title_i18n: { es: 'Toboganes' } }),
        newActivity({ title_i18n: { es: 'Hamacas' } }),
      ],
    }
    await handler(makeEvent(body))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].is_primary).toBe(true)
    expect(rows[0].name_i18n).toEqual({ es: 'Parque HaYarkon' })
    expect(rows[1].is_primary).toBe(false)
    expect(rows[1].name_i18n).toEqual({})
    expect(rows[1].location).toBeNull()
  })

  it('no suggestion_group_id when there is only one new activity', async () => {
    mockInsertSuccess()
    await handler(makeEvent(baseBody()))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].suggestion_group_id).toBeNull()
  })

  it('existing-activity items are not inserted', async () => {
    mockInsertSuccess()
    const body = {
      ...baseBody(),
      activities: [
        newActivity({ title_i18n: { es: 'Toboganes' } }),
        { mode: 'existing' as const, activity_id: '22222222-2222-4222-8222-222222222222' },
      ],
    }
    await handler(makeEvent(body))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  experience_for_existing_place branch
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/suggestions — experience_for_existing_place', () => {
  const existingPlaceBody = (overrides = {}) => ({
    place: { mode: 'existing' as const, place_id: '11111111-1111-4111-8111-111111111111' },
    activities: [newActivity({ title_i18n: { es: 'Toboganes' } })],
    locale: 'es',
    ...overrides,
  })

  it('inserts an activity-shaped suggestion with no place fields', async () => {
    mockInsertSuccess()
    await handler(makeEvent(existingPlaceBody()))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].suggestion_type).toBe('experience_for_existing_place')
    expect(rows[0].place_id).toBe('11111111-1111-4111-8111-111111111111')
    expect(rows[0].location).toBeNull()
    expect(rows[0].name_i18n).toEqual({})
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
      handler(makeEvent(existingPlaceBody({ place: { mode: 'existing', place_id: 'not-a-uuid' } })))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when title_i18n is missing on a new activity', async () => {
    const body = existingPlaceBody({ activities: [newActivity({ title_i18n: undefined })] })
    await expect(handler(makeEvent(body))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('flags flagged_possible_duplicate when a matching activity is found', async () => {
    mockInsertSuccess()
    mockFindExperienceDuplicates.mockResolvedValueOnce([
      { id: 'act-existing', title: 'Toboganes', confidence: 'high', reason: 'exact_title' },
    ])
    await handler(makeEvent(existingPlaceBody()))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].flagged_possible_duplicate).toBe(true)
    expect(rows[0].possible_duplicate_activity_id).toBe('act-existing')
  })

  it('checks each new activity independently for duplicates when there are several', async () => {
    mockInsertSuccess()
    mockFindExperienceDuplicates
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'act-x', title: 'Hamacas', confidence: 'high', reason: 'exact_title' },
      ])
    const body = existingPlaceBody({
      activities: [
        newActivity({ title_i18n: { es: 'Toboganes' } }),
        newActivity({ title_i18n: { es: 'Hamacas' } }),
      ],
    })
    await handler(makeEvent(body))
    const rows = mockInsert.mock.calls[0][0]
    expect(rows[0].flagged_possible_duplicate).toBe(false)
    expect(rows[1].flagged_possible_duplicate).toBe(true)
    expect(rows[1].possible_duplicate_activity_id).toBe('act-x')
  })
})

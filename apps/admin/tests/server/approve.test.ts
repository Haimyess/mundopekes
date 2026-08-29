import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mutable config for per-test control ───────────────────────────────────
let _deeplApiKey: string | undefined = undefined

// ── #supabase/server mock (approve.post now uses serverSupabaseServiceRole) ─
const mockSupabase = {
  from: vi.fn(),
}
vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(() => mockSupabase),
}))

// ── admin-runtime-config mock (approve.post uses getDeeplApiKey / getGooglePlacesApiKey) ─
vi.mock('../../server/utils/admin-runtime-config', () => ({
  getDeeplApiKey: vi.fn(() => _deeplApiKey),
  getGooglePlacesApiKey: vi.fn(() => 'fake-google-key'),
}))

// ── translate mock (explicitly imported in approve.post) ──────────────────
// Path relative to this test file → apps/admin/server/utils/translate.ts
vi.mock('../../server/utils/translate', () => ({
  enrichI18nField: vi.fn(async (existing: Record<string, string>) => existing),
  translateI18nField: vi.fn(async ({ existing }: { existing: Record<string, string> }) => ({
    value: existing,
    status: undefined,
  })),
}))

// ── resolve-suggestion-images mock (explicitly imported in approve.post) ──
// Default passthrough matches old behavior (suggestion.images as-is, no
// photo promotion) — the test exercising promotion overrides with mockResolvedValueOnce.
vi.mock('../../server/utils/resolve-suggestion-images', () => ({
  resolveSuggestionImages: vi.fn(
    async (_supabase: unknown, suggestion: { images: string[] | null }) => suggestion.images ?? []
  ),
}))

// ── Auto-imported server utils → vi.stubGlobal ────────────────────────────
const mockGeocode = vi.fn()
vi.stubGlobal('geocodeAddress', (...args: unknown[]) => mockGeocode(...args))
vi.stubGlobal('logInfo', vi.fn().mockResolvedValue(undefined))
const mockLogWarn = vi.fn().mockResolvedValue(undefined)
vi.stubGlobal('logWarn', mockLogWarn)
vi.stubGlobal('logError', vi.fn().mockResolvedValue(undefined))
// Re-check duplicados al aprobar (Phase 6) — default sin duplicados; los
// tests que ejercitan el re-check pisan estos mocks con mockResolvedValueOnce.
const mockFindPlaceDuplicates = vi.fn().mockResolvedValue([])
const mockFindExperienceDuplicates = vi.fn().mockResolvedValue([])
vi.stubGlobal('findPlaceDuplicates', mockFindPlaceDuplicates)
vi.stubGlobal('findExperienceDuplicates', mockFindExperienceDuplicates)
// requireAdminUser is no longer called from approve.post.ts itself — the
// admin auth check moved to server/middleware/require-admin.ts (global for
// every /api/** request), covered by tests/server/require-admin-middleware.test.ts
vi.stubGlobal('sanitizeHttpUrl', (value: string | null | undefined) => {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null
  } catch {
    return null
  }
})
// normalizeName (layers/domain/server/utils/duplicate-detection.ts) — real
// implementation, cheap and pure, no need to fake it.
vi.stubGlobal('normalizeName', (raw: string | null | undefined) =>
  (raw ?? '')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
)

// ── Nuxt / h3 globals (also set in tests/setup.ts, repeated for safety) ──
vi.stubGlobal('defineEventHandler', (fn: (e: unknown) => unknown) => fn)
vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('sug-001'))
vi.stubGlobal('createError', (input: Record<string, unknown>) => {
  const err = new Error(String(input.message ?? input.statusMessage ?? 'error')) as Error & {
    statusCode: number
  }
  err.statusCode = (input.statusCode as number) ?? 500
  return err
})
// ── Load handler (after stubs) ────────────────────────────────────────────
const { default: handler } = await import('../../server/api/suggestions/[id]/approve.post')
const { resolveSuggestionImages: mockResolveSuggestionImages } =
  await import('../../server/utils/resolve-suggestion-images')

// ── Suggestion factory ────────────────────────────────────────────────────
const makeSuggestion = (overrides: Record<string, unknown> = {}) => ({
  id: 'sug-001',
  status: 'pending',
  name_i18n: { es: 'Parque HaYarkon', he: 'גן הירקון' },
  description_i18n: {},
  location: { city: 'Tel Aviv', address: 'Sderot Rokach', lat: 32.1, lng: 34.8 },
  category_id: 'cat-001',
  age_range: { ids: [1, 2] },
  best_season: ['spring', 'summer'],
  is_free: false,
  stroller_friendly: true,
  open_weekends: true,
  schedule: 'Lunes–Viernes 9–17',
  images: [],
  metadata: {
    google_place_id: 'gp-001',
    phone: '+972-3-123',
    website: 'https://park.il',
    has_shadow: true,
    has_bathrooms: false,
    price: 25,
    hours_unknown: false,
    title_i18n: { es: 'Juegos en HaYarkon' },
  },
  ...overrides,
})

// ── Supabase mock builder ─────────────────────────────────────────────────
type TableMock = {
  selectSingle?: unknown
  insertResult?: unknown
  inResult?: unknown[]
}

function setupSupabase(tables: Record<string, TableMock> = {}) {
  const defaultPlace = { id: 'place-001' }
  const defaultActivity = { id: 'act-001' }

  mockSupabase.from.mockImplementation((table: string) => {
    const t = tables[table] ?? {}
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: t.selectSingle ?? null,
            error: t.selectSingle ? null : null,
          }),
        })),
        ilike: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: t.selectSingle ?? null,
            error: null,
          }),
        })),
        in: vi.fn().mockResolvedValue({
          data: t.inResult ?? [],
          error: null,
        }),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data:
              t.insertResult !== undefined
                ? t.insertResult
                : table === 'places'
                  ? defaultPlace
                  : table === 'activities'
                    ? defaultActivity
                    : { id: `${table}-new` },
            error: null,
          }),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }
  })
}

function makeEvent() {
  return {} as Parameters<typeof handler>[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  _deeplApiKey = undefined
  vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('sug-001'))
  mockGeocode.mockResolvedValue(null)
})

// ══════════════════════════��═══════════════════════════════��════════════════
//  Title resolution
// ═══════════════════════════════════════════════════════════════════════════
describe('approve.post — title resolution', () => {
  it('uses metadata.title_i18n as activity title when present', async () => {
    const suggestion = makeSuggestion()
    setupSupabase({
      suggestions: { selectSingle: suggestion },
      cities: { selectSingle: { id: 42 } },
    })

    let capturedActivity: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'activities') {
        return {
          insert: vi.fn((data) => {
            capturedActivity = data as Record<string, unknown>
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'act-001' }, error: null }),
              })),
            }
          }),
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await handler(makeEvent())
    expect(capturedActivity?.title_i18n).toEqual({ es: 'Juegos en HaYarkon' })
  })

  it('falls back to name_i18n for title when metadata.title_i18n is null', async () => {
    const suggestion = makeSuggestion({
      metadata: { ...makeSuggestion().metadata, title_i18n: null },
    })
    setupSupabase({
      suggestions: { selectSingle: suggestion },
      cities: { selectSingle: { id: 42 } },
    })

    let capturedActivity: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'activities') {
        return {
          insert: vi.fn((data) => {
            capturedActivity = data as Record<string, unknown>
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'act-001' }, error: null }),
              })),
            }
          }),
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await handler(makeEvent())
    const title = capturedActivity?.title_i18n as Record<string, string>
    expect(title?.es).toBe('Parque HaYarkon')
  })

  it('without deeplApiKey translateI18nField is not called', async () => {
    const { translateI18nField } = await import('../../server/utils/translate')
    const suggestion = makeSuggestion()
    setupSupabase({
      suggestions: { selectSingle: suggestion },
      cities: { selectSingle: { id: 42 } },
    })
    mockSupabase.from.mockImplementation((table) =>
      buildTableMock(table, { suggestions: suggestion })
    )

    await handler(makeEvent())
    expect(translateI18nField).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  Geocoding
// ═══════════════════════════════════════════════════════════════════════════
describe('approve.post — geocoding', () => {
  it('does NOT call geocodeAddress when coords are already present', async () => {
    const suggestion = makeSuggestion() // has lat: 32.1, lng: 34.8
    setupSupabase({
      suggestions: { selectSingle: suggestion },
      cities: { selectSingle: { id: 42 } },
    })
    mockSupabase.from.mockImplementation((table) =>
      buildTableMock(table, { suggestions: suggestion })
    )

    await handler(makeEvent())
    expect(mockGeocode).not.toHaveBeenCalled()
  })

  it('calls geocodeAddress when lat is null', async () => {
    const suggestion = makeSuggestion({
      location: { city: 'Tel Aviv', address: 'Sderot Rokach', lat: null, lng: null },
    })
    mockGeocode.mockResolvedValue({ lat: 31.5, lng: 34.6 })

    let capturedPlace: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'places') {
        return {
          insert: vi.fn((data) => {
            capturedPlace = data as Record<string, unknown>
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'place-001' }, error: null }),
              })),
            }
          }),
          delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await handler(makeEvent())
    expect(mockGeocode).toHaveBeenCalledWith('Sderot Rokach, Tel Aviv')
    expect(capturedPlace?.lat).toBe(31.5)
    expect(capturedPlace?.lng).toBe(34.6)
  })

  it('creates place with null coords when geocoding fails', async () => {
    const suggestion = makeSuggestion({
      location: { city: 'Tel Aviv', address: 'Sderot Rokach', lat: null, lng: null },
    })
    mockGeocode.mockResolvedValue(null)

    let capturedPlace: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'places') {
        return {
          insert: vi.fn((data) => {
            capturedPlace = data as Record<string, unknown>
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'place-001' }, error: null }),
              })),
            }
          }),
          delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await handler(makeEvent())
    expect(capturedPlace?.lat).toBeNull()
    expect(capturedPlace?.lng).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  Image promotion (Phase 7 / §K)
// ═══════════════════════════════════════════════════════════════════════════
describe('approve.post — image promotion', () => {
  it('uses resolveSuggestionImages for both the place and the activity', async () => {
    mockResolveSuggestionImages.mockResolvedValueOnce([
      'https://storage.example/place-images/promoted-1.jpg',
    ])
    const suggestion = makeSuggestion()

    let capturedPlace: Record<string, unknown> | null = null
    let capturedActivity: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'places') {
        return {
          insert: vi.fn((data) => {
            capturedPlace = data as Record<string, unknown>
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'place-001' }, error: null }),
              })),
            }
          }),
          delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        }
      }
      if (table === 'activities') {
        return {
          insert: vi.fn((data) => {
            capturedActivity = data as Record<string, unknown>
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'act-001' }, error: null }),
              })),
            }
          }),
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await handler(makeEvent())

    expect(mockResolveSuggestionImages).toHaveBeenCalledTimes(1) // once, reused for both
    expect(capturedPlace?.images).toEqual(['https://storage.example/place-images/promoted-1.jpg'])
    expect(capturedActivity?.images).toEqual([
      'https://storage.example/place-images/promoted-1.jpg',
    ])
  })

  it('resolves images for the experience_for_existing_place branch too', async () => {
    mockResolveSuggestionImages.mockResolvedValueOnce(['https://storage.example/promoted-2.jpg'])
    const suggestion = makeSuggestion({
      suggestion_type: 'experience_for_existing_place',
      place_id: 'place-001',
    })

    let capturedActivity: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'places') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'place-001' }, error: null }),
            })),
          })),
        }
      }
      if (table === 'activities') {
        return {
          insert: vi.fn((data) => {
            capturedActivity = data as Record<string, unknown>
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'act-001' }, error: null }),
              })),
            }
          }),
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await handler(makeEvent())

    expect(capturedActivity?.images).toEqual(['https://storage.example/promoted-2.jpg'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  Activity payload
// ═══════════════════════════════════════════════════════════════════════════
describe('approve.post — activity payload', () => {
  it('transfers has_shadow and has_bathrooms from metadata', async () => {
    const suggestion = makeSuggestion()
    let capturedActivity: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'activities') {
        return {
          insert: vi.fn((data) => {
            capturedActivity = data as Record<string, unknown>
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'act-001' }, error: null }),
              })),
            }
          }),
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await handler(makeEvent())
    const meta = capturedActivity?.metadata as Record<string, unknown>
    expect(meta?.has_shadow).toBe(true)
    expect(meta?.has_bathrooms).toBe(false)
  })

  it('price is null when is_free=true', async () => {
    const suggestion = makeSuggestion({ is_free: true })
    let capturedActivity: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'activities') {
        return {
          insert: vi.fn((data) => {
            capturedActivity = data as Record<string, unknown>
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'act-001' }, error: null }),
              })),
            }
          }),
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await handler(makeEvent())
    expect(capturedActivity?.price).toBeNull()
  })

  it('price is taken from metadata.price when is_free=false', async () => {
    const suggestion = makeSuggestion({ is_free: false })
    let capturedActivity: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'activities') {
        return {
          insert: vi.fn((data) => {
            capturedActivity = data as Record<string, unknown>
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'act-001' }, error: null }),
              })),
            }
          }),
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await handler(makeEvent())
    expect(capturedActivity?.price).toBe(25)
  })

  it('hours_unknown=true → activity.schedule=null, metadata.hours_unknown=true', async () => {
    const suggestion = makeSuggestion({
      metadata: { ...makeSuggestion().metadata, hours_unknown: true },
    })
    let capturedActivity: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'activities') {
        return {
          insert: vi.fn((data) => {
            capturedActivity = data as Record<string, unknown>
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'act-001' }, error: null }),
              })),
            }
          }),
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await handler(makeEvent())
    expect(capturedActivity?.schedule).toBeNull()
    const meta = capturedActivity?.metadata as Record<string, unknown>
    expect(meta?.hours_unknown).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  Season pivot
// ═══════════════════════════════════════════════════════════════════════════
describe('approve.post — season pivot', () => {
  it('best_season=[all] with no DB row → 0 pivot inserts, no throw', async () => {
    const suggestion = makeSuggestion({ best_season: ['all'] })
    const seasonInsertSpy = vi.fn(() => Promise.resolve({ error: null }))

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        }
      }
      if (table === 'activity_seasons') {
        return {
          delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
          insert: seasonInsertSpy,
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await expect(handler(makeEvent())).resolves.toBeDefined()
    expect(seasonInsertSpy).not.toHaveBeenCalled()
  })

  it('season pivot inserts rows resolved by value', async () => {
    const suggestion = makeSuggestion({ best_season: ['spring', 'summer'] })
    const seasonInsertSpy = vi.fn(() => Promise.resolve({ error: null }))

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [
                { id: 10, value: 'spring' },
                { id: 11, value: 'summer' },
              ],
              error: null,
            }),
          })),
        }
      }
      if (table === 'activity_seasons') {
        return {
          delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
          insert: seasonInsertSpy,
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await handler(makeEvent())
    expect(seasonInsertSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ season_id: 10 }),
        expect.objectContaining({ season_id: 11 }),
      ])
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  Duplicate re-check at approval time (Phase 6)
// ═══════════════════════════════════════════════════════════════════════════
describe('approve.post — duplicate re-check', () => {
  it('flags a fresh duplicate place and persists it (new_place_with_experience)', async () => {
    const suggestion = makeSuggestion()
    mockFindPlaceDuplicates.mockResolvedValueOnce([
      {
        id: 'place-dup-1',
        name: 'Similar Park',
        city_id: 1,
        confidence: 'medium',
        reason: 'nearby_similar_name',
      },
    ])

    let capturedSuggestionUpdate: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'suggestions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: suggestion, error: null }),
            })),
          })),
          update: vi.fn((data) => {
            capturedSuggestionUpdate = data as Record<string, unknown>
            return { eq: vi.fn().mockResolvedValue({ error: null }) }
          }),
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await handler(makeEvent())

    expect(mockFindPlaceDuplicates).toHaveBeenCalled()
    expect(capturedSuggestionUpdate?.flagged_possible_duplicate).toBe(true)
    expect(capturedSuggestionUpdate?.possible_duplicate_of).toBe('place-dup-1')
    expect(mockLogWarn).toHaveBeenCalled()
  })

  it('skips the re-check entirely when the suggestion is already flagged', async () => {
    const suggestion = makeSuggestion({ flagged_possible_duplicate: true })
    mockSupabase.from.mockImplementation((table) =>
      buildTableMock(table, { suggestions: suggestion })
    )

    await handler(makeEvent())

    expect(mockFindPlaceDuplicates).not.toHaveBeenCalled()
  })

  it('flags a fresh duplicate activity (experience_for_existing_place)', async () => {
    const suggestion = makeSuggestion({
      suggestion_type: 'experience_for_existing_place',
      place_id: 'place-001',
    })
    mockFindExperienceDuplicates.mockResolvedValueOnce([
      { id: 'act-dup-1', title: 'Juegos en HaYarkon', confidence: 'high', reason: 'exact_title' },
    ])

    let capturedSuggestionUpdate: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'places') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'place-001' }, error: null }),
            })),
          })),
        }
      }
      if (table === 'suggestions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: suggestion, error: null }),
            })),
          })),
          update: vi.fn((data) => {
            capturedSuggestionUpdate = data as Record<string, unknown>
            return { eq: vi.fn().mockResolvedValue({ error: null }) }
          }),
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await handler(makeEvent())

    expect(mockFindExperienceDuplicates).toHaveBeenCalled()
    expect(capturedSuggestionUpdate?.flagged_possible_duplicate).toBe(true)
    expect(capturedSuggestionUpdate?.possible_duplicate_activity_id).toBe('act-dup-1')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  Rollback
// ═══════════════════════════════════════════════════════════════════════════
describe('approve.post — rollback on activity insert failure', () => {
  it('deletes the place when activity insert fails', async () => {
    const suggestion = makeSuggestion()
    const deleteSpy = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'activities') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi
                .fn()
                .mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
            })),
          })),
        }
      }
      if (table === 'places') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'place-001' }, error: null }),
            })),
          })),
          delete: deleteSpy,
        }
      }
      return buildTableMock(table, { suggestions: suggestion })
    })

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 500 })
    expect(deleteSpy).toHaveBeenCalled()
  })
})

// ══════════════════════════════════════════════���════════════════════════════
//  Helper: build a default mock for any table
// ═══════════════════════════════════════════════════════════════════════════
function buildTableMock(table: string, metas: { suggestions?: unknown } = {}) {
  if (table === 'suggestions') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: metas.suggestions ?? null, error: null }),
        })),
      })),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    }
  }
  if (table === 'cities') {
    return {
      select: vi.fn(() => ({
        ilike: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 42 }, error: null }),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 99 }, error: null }),
        })),
      })),
    }
  }
  if (table === 'places') {
    return {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'place-001' }, error: null }),
        })),
      })),
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    }
  }
  if (table === 'activities') {
    return {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'act-001' }, error: null }),
        })),
      })),
    }
  }
  if (table === 'activity_age_ranges') {
    return {
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    }
  }
  if (table === 'seasons') {
    return {
      select: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    }
  }
  if (table === 'activity_seasons') {
    return {
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    }
  }
  return {
    select: vi.fn(() => ({ eq: vi.fn() })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: `${table}-new` }, error: null }),
      })),
    })),
    delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
  }
}

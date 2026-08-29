import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mutable config ──────────────────────────────────────────────────────────
let _deeplApiKey: string | undefined = undefined
let _body: Record<string, unknown> = { target_place_id: 'place-existing' }

// ── #supabase/server mock ───────────────────────────────────────────────────
const mockSupabase = { from: vi.fn() }
vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(() => mockSupabase),
}))

vi.mock('../../server/utils/admin-runtime-config', () => ({
  getDeeplApiKey: vi.fn(() => _deeplApiKey),
  getGooglePlacesApiKey: vi.fn(() => 'fake-google-key'),
}))

vi.mock('../../server/utils/resolve-suggestion-images', () => ({
  resolveSuggestionImages: vi.fn(
    async (_supabase: unknown, suggestion: { images: string[] | null }) => suggestion.images ?? []
  ),
}))

vi.mock('../../server/utils/translate', () => ({
  enrichI18nField: vi.fn(async (existing: Record<string, string>) => existing),
  translateI18nField: vi.fn(async ({ existing }: { existing: Record<string, string> }) => ({
    value: existing,
    status: undefined,
  })),
}))

// ── Auto-imported globals ───────────────────────────────────────────────────
vi.stubGlobal('logInfo', vi.fn().mockResolvedValue(undefined))
const mockLogWarn = vi.fn().mockResolvedValue(undefined)
vi.stubGlobal('logWarn', mockLogWarn)
vi.stubGlobal('logError', vi.fn().mockResolvedValue(undefined))
// Re-check de actividad duplicada en el lugar destino (Phase 6) — default sin
// duplicados; el test que lo ejercita pisa esto con mockResolvedValueOnce.
const mockFindExperienceDuplicates = vi.fn().mockResolvedValue([])
vi.stubGlobal('findExperienceDuplicates', mockFindExperienceDuplicates)
vi.stubGlobal('defineEventHandler', (fn: (e: unknown) => unknown) => fn)
vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('sug-001'))
vi.stubGlobal(
  'readBody',
  vi.fn(async () => _body)
)
vi.stubGlobal('createError', (input: Record<string, unknown>) => {
  const err = new Error(String(input.message ?? input.statusMessage ?? 'error')) as Error & {
    statusCode: number
  }
  err.statusCode = (input.statusCode as number) ?? 500
  return err
})

const { default: handler } = await import('../../server/api/suggestions/[id]/merge.post')
const { resolveSuggestionImages: mockResolveSuggestionImages } =
  await import('../../server/utils/resolve-suggestion-images')

// ── Fixtures ─────────────────────────────────────────────────────────────
const makeSuggestion = (overrides: Record<string, unknown> = {}) => ({
  id: 'sug-001',
  status: 'pending',
  suggestion_type: 'new_place_with_experience',
  place_id: null,
  name_i18n: { es: 'Parque Nuevo' },
  description_i18n: {},
  category_id: 'cat-001',
  age_range: { ids: [1] },
  best_season: ['spring'],
  is_free: true,
  stroller_friendly: true,
  open_weekends: false,
  schedule: null,
  images: [],
  metadata: { title_i18n: { es: 'Toboganes' } },
  ...overrides,
})

function makeEvent() {
  return {} as Parameters<typeof handler>[0]
}

function setupSupabase({
  suggestion,
  place = { id: 'place-existing', name_i18n: { es: 'Lugar Existente' } },
  activityInsertResult = { data: { id: 'act-new' }, error: null },
  placesUpdateSpy,
  suggestionsUpdateSpy,
}: {
  suggestion: unknown
  place?: unknown | null
  activityInsertResult?: { data: unknown; error: unknown }
  placesUpdateSpy?: ReturnType<typeof vi.fn>
  suggestionsUpdateSpy?: ReturnType<typeof vi.fn>
}) {
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'suggestions') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: suggestion, error: null }),
          })),
        })),
        update: vi.fn((data) => {
          suggestionsUpdateSpy?.(data)
          return { eq: vi.fn().mockResolvedValue({ error: null }) }
        }),
      }
    }
    if (table === 'places') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi
              .fn()
              .mockResolvedValue({ data: place, error: place ? null : { message: 'not found' } }),
          })),
        })),
        insert: vi.fn(() => {
          throw new Error('places.insert should never be called by merge')
        }),
        update: vi.fn((data) => {
          placesUpdateSpy?.(data)
          return { eq: vi.fn().mockResolvedValue({ error: null }) }
        }),
      }
    }
    if (table === 'activities') {
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue(activityInsertResult),
          })),
        })),
      }
    }
    if (table === 'activity_age_ranges' || table === 'activity_seasons') {
      return {
        delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      }
    }
    if (table === 'seasons') {
      return { select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })) }
    }
    return {
      select: vi.fn(() => ({ eq: vi.fn() })),
      insert: vi.fn(),
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  _deeplApiKey = undefined
  _body = { target_place_id: 'place-existing' }
  vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('sug-001'))
})

describe('POST /api/suggestions/:id/merge', () => {
  it('throws 400 when target_place_id is missing from the body', async () => {
    _body = {}
    setupSupabase({ suggestion: makeSuggestion() })
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when the suggestion is already processed', async () => {
    setupSupabase({ suggestion: makeSuggestion({ status: 'approved' }) })
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 when the target place does not exist', async () => {
    setupSupabase({ suggestion: makeSuggestion(), place: null })
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 })
  })

  it('never inserts a new place — creates only an activity for target_place_id', async () => {
    let capturedActivity: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'activities') {
        return {
          insert: vi.fn((data) => {
            capturedActivity = data as Record<string, unknown>
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'act-new' }, error: null }),
              })),
            }
          }),
        }
      }
      if (table === 'suggestions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: makeSuggestion(), error: null }),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        }
      }
      if (table === 'places') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi
                .fn()
                .mockResolvedValue({ data: { id: 'place-existing', name_i18n: {} }, error: null }),
            })),
          })),
        }
      }
      if (table === 'activity_age_ranges' || table === 'activity_seasons') {
        return {
          delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
        }
      }
      if (table === 'seasons') {
        return {
          select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })),
        }
      }
      throw new Error(`unexpected table ${table}`)
    })

    const result = await handler(makeEvent())
    expect(capturedActivity?.place_id).toBe('place-existing')
    expect((result as { place: { id: string } }).place.id).toBe('place-existing')
  })

  it('discards proposed place fields (name/description) — activity has no place data', async () => {
    let capturedActivity: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'activities') {
        return {
          insert: vi.fn((data) => {
            capturedActivity = data as Record<string, unknown>
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'act-new' }, error: null }),
              })),
            }
          }),
        }
      }
      if (table === 'suggestions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: makeSuggestion({ name_i18n: { es: 'Nombre lugar propuesto' } }),
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        }
      }
      if (table === 'places') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi
                .fn()
                .mockResolvedValue({ data: { id: 'place-existing', name_i18n: {} }, error: null }),
            })),
          })),
        }
      }
      if (table === 'activity_age_ranges' || table === 'activity_seasons') {
        return {
          delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
        }
      }
      if (table === 'seasons') {
        return {
          select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })),
        }
      }
      throw new Error(`unexpected table ${table}`)
    })

    await handler(makeEvent())
    // description_i18n on the activity defaults to {} — the proposed place
    // name never leaks into the activity payload at all.
    expect(capturedActivity?.description_i18n).toEqual({})
    expect(Object.prototype.hasOwnProperty.call(capturedActivity ?? {}, 'name_i18n')).toBe(false)
  })

  it('marks the suggestion approved with place_id + suggestion_type=experience_for_existing_place', async () => {
    const suggestionsUpdateSpy = vi.fn()
    setupSupabase({ suggestion: makeSuggestion(), suggestionsUpdateSpy })
    await handler(makeEvent())
    expect(suggestionsUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        place_id: 'place-existing',
        suggestion_type: 'experience_for_existing_place',
      })
    )
  })

  it('flags a duplicate activity when the target place already has a similar one', async () => {
    mockFindExperienceDuplicates.mockResolvedValueOnce([
      { id: 'act-dup-1', title: 'Toboganes', confidence: 'high', reason: 'exact_title' },
    ])
    const suggestionsUpdateSpy = vi.fn()
    setupSupabase({ suggestion: makeSuggestion(), suggestionsUpdateSpy })

    await handler(makeEvent())

    expect(mockFindExperienceDuplicates).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ placeId: 'place-existing' })
    )
    expect(suggestionsUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        flagged_possible_duplicate: true,
        possible_duplicate_activity_id: 'act-dup-1',
      })
    )
    expect(mockLogWarn).toHaveBeenCalled()
  })

  it('does not flag anything when the target place has no similar activity', async () => {
    const suggestionsUpdateSpy = vi.fn()
    setupSupabase({ suggestion: makeSuggestion(), suggestionsUpdateSpy })

    await handler(makeEvent())

    const updateArg = suggestionsUpdateSpy.mock.calls[0]?.[0] as Record<string, unknown>
    expect(updateArg.flagged_possible_duplicate).toBeUndefined()
    expect(updateArg.possible_duplicate_activity_id).toBeUndefined()
  })

  it('uses resolveSuggestionImages for the merged activity (Phase 7 / §K)', async () => {
    mockResolveSuggestionImages.mockResolvedValueOnce(['https://storage.example/promoted.jpg'])

    let capturedActivity: Record<string, unknown> | null = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'activities') {
        return {
          insert: vi.fn((data) => {
            capturedActivity = data as Record<string, unknown>
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'act-new' }, error: null }),
              })),
            }
          }),
        }
      }
      if (table === 'suggestions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: makeSuggestion(), error: null }),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        }
      }
      if (table === 'places') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi
                .fn()
                .mockResolvedValue({ data: { id: 'place-existing', name_i18n: {} }, error: null }),
            })),
          })),
        }
      }
      if (table === 'activity_age_ranges' || table === 'activity_seasons') {
        return {
          delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
        }
      }
      if (table === 'seasons') {
        return {
          select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })),
        }
      }
      throw new Error(`unexpected table ${table}`)
    })

    await handler(makeEvent())
    expect(capturedActivity?.images).toEqual(['https://storage.example/promoted.jpg'])
  })

  it('works the same way for a suggestion that started as experience_for_existing_place (re-associate)', async () => {
    const suggestion = makeSuggestion({
      suggestion_type: 'experience_for_existing_place',
      place_id: 'place-wrong-match',
    })
    _body = { target_place_id: 'place-correct' }
    const suggestionsUpdateSpy = vi.fn()
    setupSupabase({
      suggestion,
      place: { id: 'place-correct', name_i18n: {} },
      suggestionsUpdateSpy,
    })
    const result = await handler(makeEvent())
    expect((result as { place: { id: string } }).place.id).toBe('place-correct')
    expect(suggestionsUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ place_id: 'place-correct' })
    )
  })
})

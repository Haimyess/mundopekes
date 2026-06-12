import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase mock ──────────────────────────────────────────────────────────
let _existingRow: unknown = null

const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn(() => ({
  eq: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({ data: { id: 'sug-001' }, error: null }),
    })),
  })),
}))

const mockSelectEq = vi.fn()
const mockSelectSingle = vi.fn()
const mockSelectBase = vi.fn(() => ({
  eq: vi.fn(() => ({ single: mockSelectSingle })),
}))

const mockFrom = vi.fn((table: string) => {
  if (table === 'suggestions') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: _existingRow, error: null }),
        })),
      })),
      update: mockUpdate,
    }
  }
  return {
    select: mockSelectBase,
    update: mockUpdate,
  }
})

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(async () => ({ from: mockFrom })),
}))

// ── geocode: auto-imported server util → vi.stubGlobal ────────────────────
const mockGeocode = vi.fn()

// ── Global stubs ───────────────────────────────────────────────────────────
vi.stubGlobal('defineEventHandler', (fn: (e: unknown) => unknown) => fn)
vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('sug-001'))
const mockReadBody = vi.fn()
vi.stubGlobal('readBody', mockReadBody)
vi.stubGlobal('createError', (input: Record<string, unknown>) => {
  const err = new Error(String(input.message ?? input.statusMessage ?? 'error')) as Error & {
    statusCode: number
  }
  err.statusCode = (input.statusCode as number) ?? 500
  return err
})
vi.stubGlobal('geocodeAddress', (...args: unknown[]) => mockGeocode(...args))
vi.stubGlobal('logInfo', vi.fn().mockResolvedValue(undefined))
vi.stubGlobal('logWarn', vi.fn().mockResolvedValue(undefined))
vi.stubGlobal('logError', vi.fn().mockResolvedValue(undefined))

// ── Load handler ───────────────────────────────────────────────────────────
const { default: handler } = await import('../../server/api/suggestions/[id]/index.put')

function makeEvent(body: unknown) {
  mockReadBody.mockResolvedValue(body)
  return {} as Parameters<typeof handler>[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  _existingRow = null
  vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('sug-001'))
  mockGeocode.mockResolvedValue(null)
  mockUpdate.mockReturnValue({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: 'sug-001' }, error: null }),
      })),
    })),
  })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'suggestions') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: _existingRow, error: null }),
          })),
        })),
        update: mockUpdate,
      }
    }
    return { select: mockSelectBase, update: mockUpdate }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  Metadata merge
// ═══════════════════════════════════════════════════════════════════════════
describe('PUT /api/suggestions/[id] — metadata merge', () => {
  it('merges incoming metadata with existing (does not overwrite)', async () => {
    _existingRow = {
      metadata: {
        google_place_id: 'gp-001',
        photos: ['photo1.jpg'],
        schedule_structured: { monday: { open: true } },
      },
      location: null,
    }

    let capturedUpdate: unknown
    mockUpdate.mockImplementation((data) => {
      capturedUpdate = data
      return {
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'sug-001' }, error: null }),
          })),
        })),
      }
    })

    await handler(
      makeEvent({
        metadata: { title_i18n: { es: 'Nuevo título' } },
      })
    )

    const mergedMeta = (capturedUpdate as Record<string, unknown>)?.metadata as Record<
      string,
      unknown
    >
    // New key added
    expect(mergedMeta.title_i18n).toEqual({ es: 'Nuevo título' })
    // Existing keys preserved
    expect(mergedMeta.google_place_id).toBe('gp-001')
    expect(mergedMeta.photos).toEqual(['photo1.jpg'])
    expect(mergedMeta.schedule_structured).toEqual({ monday: { open: true } })
  })

  it('does not fetch existing row when metadata is not in body', async () => {
    await handler(makeEvent({ status: 'approved' }))
    // from('suggestions') is called only once: for the update (not for a select)
    // When metadata IS present, it would be called twice (select + update)
    expect(mockFrom.mock.calls.filter((c) => c[0] === 'suggestions')).toHaveLength(1)
    expect(mockUpdate).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  category_id persistence
// ═══════════════════════════════════════════════════════════════════════════
describe('PUT /api/suggestions/[id] — category_id', () => {
  it('persists category_id when included in body', async () => {
    let capturedUpdate: unknown
    mockUpdate.mockImplementation((data) => {
      capturedUpdate = data
      return {
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'sug-001' }, error: null }),
          })),
        })),
      }
    })

    await handler(makeEvent({ category_id: 'cat-new' }))

    expect((capturedUpdate as Record<string, unknown>)?.category_id).toBe('cat-new')
  })

  it('does not include category_id in update when not in body', async () => {
    let capturedUpdate: unknown
    mockUpdate.mockImplementation((data) => {
      capturedUpdate = data
      return {
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'sug-001' }, error: null }),
          })),
        })),
      }
    })

    await handler(makeEvent({ status: 'pending' }))

    expect(capturedUpdate as Record<string, unknown>).not.toHaveProperty('category_id')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  Geocoding on address change
// ═══════════════════════════════════════════════════════════════════════════
describe('PUT /api/suggestions/[id] — geocoding', () => {
  it('geocodes when location has address but no coords', async () => {
    _existingRow = { metadata: null, location: { lat: 32.1, lng: 34.8 } }
    mockGeocode.mockResolvedValue({ lat: 31.9, lng: 34.7 })

    let capturedUpdate: unknown
    mockUpdate.mockImplementation((data) => {
      capturedUpdate = data
      return {
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'sug-001' }, error: null }),
          })),
        })),
      }
    })

    await handler(makeEvent({ location: { city: 'Tel Aviv', address: 'Ben Yehuda 5' } }))

    expect(mockGeocode).toHaveBeenCalled()
    const loc = (capturedUpdate as Record<string, unknown>)?.location as Record<string, unknown>
    expect(loc.lat).toBe(31.9)
    expect(loc.lng).toBe(34.7)
  })

  it('does not geocode when coords are already provided', async () => {
    await handler(
      makeEvent({ location: { city: 'Tel Aviv', address: 'Ben Yehuda', lat: 32.1, lng: 34.8 } })
    )

    expect(mockGeocode).not.toHaveBeenCalled()
  })

  it('falls back to existing coords when geocoding fails', async () => {
    _existingRow = { metadata: null, location: { lat: 32.1, lng: 34.8 } }
    mockGeocode.mockResolvedValue(null)

    let capturedUpdate: unknown
    mockUpdate.mockImplementation((data) => {
      capturedUpdate = data
      return {
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'sug-001' }, error: null }),
          })),
        })),
      }
    })

    await handler(makeEvent({ location: { city: 'Tel Aviv', address: 'Nowhere 999' } }))

    const loc = (capturedUpdate as Record<string, unknown>)?.location as Record<string, unknown>
    expect(loc.lat).toBe(32.1)
    expect(loc.lng).toBe(34.8)
  })
})

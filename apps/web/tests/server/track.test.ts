import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VALIDATION_ERRORS } from '@mundopekes/schemas'

const mockReadBody = vi.fn()
const mockCheckRateLimit = vi.fn().mockResolvedValue(undefined)
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockFrom = vi.fn(() => ({ insert: mockInsert }))

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(() => ({ from: mockFrom })),
}))

const h3 = await import('h3')
vi.stubGlobal('defineEventHandler', h3.defineEventHandler)
vi.stubGlobal('createError', h3.createError)
vi.stubGlobal('readBody', mockReadBody)
vi.stubGlobal('checkRateLimit', mockCheckRateLimit)

const { default: handler } = await import('../../server/api/track.post')

const VALID_EVENT = {
  event_type: 'activity_view',
  session_id: 'session-1',
  locale: 'he',
  payload: { activity_id: 'a1' },
}

const callWith = (body: unknown) => {
  mockReadBody.mockResolvedValue(body)
  return handler({} as Parameters<typeof handler>[0])
}

describe('POST /api/track', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
  })

  it('stores a valid event', async () => {
    await expect(callWith(VALID_EVENT)).resolves.toEqual({ ok: true })
    expect(mockFrom).toHaveBeenCalledWith('activity_events')
    expect(mockInsert).toHaveBeenCalledWith(VALID_EVENT)
  })

  it('rate limits before validating', async () => {
    await callWith(VALID_EVENT)
    expect(mockCheckRateLimit).toHaveBeenCalledWith(expect.anything(), 'track', {
      limit: 60,
      windowSeconds: 60,
    })
  })

  it('rejects unknown event types with the shared validation key', async () => {
    await expect(callWith({ ...VALID_EVENT, event_type: 'nope' })).rejects.toMatchObject({
      statusCode: 400,
      message: VALIDATION_ERRORS.invalidOption,
    })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects oversized payloads', async () => {
    const payload = { blob: 'a'.repeat(4000) }
    await expect(callWith({ ...VALID_EVENT, payload })).rejects.toMatchObject({
      statusCode: 400,
      message: VALIDATION_ERRORS.payloadTooLarge,
    })
  })

  it('surfaces database errors as 500', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'db down' } })
    await expect(callWith(VALID_EVENT)).rejects.toMatchObject({ statusCode: 500 })
  })
})

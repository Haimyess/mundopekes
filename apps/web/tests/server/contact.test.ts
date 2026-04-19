import { describe, it, expect, vi } from 'vitest'

// ── h3 mocks ───────────────────────────────────────────────────────────────
const mockGetRequestIP = vi.fn().mockReturnValue('1.2.3.4')
const mockGetRequestHeader = vi.fn().mockReturnValue(null)
const mockReadBody = vi.fn()

vi.mock('h3', async (importOriginal) => {
  const h3 = await importOriginal<typeof import('h3')>()
  // createH3Error is internal to h3 (not in public exports) but used by
  // Nuxt's createError wrapper — shim it so the mock doesn't break Nuxt internals.
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
  return {
    ...h3,
    createH3Error,
    readBody: mockReadBody,
    getRequestHeader: mockGetRequestHeader,
    getRequestIP: mockGetRequestIP,
  }
})

// ── Supabase mock ──────────────────────────────────────────────────────────
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockFrom = vi.fn(() => ({ insert: mockInsert }))

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(() => ({ from: mockFrom })),
}))

// ── Resend mock ────────────────────────────────────────────────────────────
const mockSendEmail = vi.fn().mockResolvedValue({ id: 'test-id' })
vi.mock('resend', () => ({
  Resend: vi.fn(function () {
    return { emails: { send: mockSendEmail } }
  }),
}))

// ── Logger mock ────────────────────────────────────────────────────────────
vi.mock('~/server/utils/logger', () => ({
  logInfo: vi.fn().mockResolvedValue(undefined),
  logError: vi.fn().mockResolvedValue(undefined),
}))

// ── Nuxt server auto-import globals ───────────────────────────────────────
const h3 = await import('h3')
vi.stubGlobal('defineEventHandler', h3.defineEventHandler)
vi.stubGlobal('createError', h3.createError)
vi.stubGlobal('readBody', mockReadBody)
vi.stubGlobal('getRequestHeader', mockGetRequestHeader)
vi.stubGlobal('getRequestIP', mockGetRequestIP)
vi.stubGlobal('useRuntimeConfig', () => ({}))

// ── Load handler ───────────────────────────────────────────────────────────
const { default: handler } = await import('../../server/api/contact/index.post')

const validBody = {
  intent: 'feedback',
  name: 'Test User',
  email: 'test@example.com',
  message: 'Hello world',
  locale: 'es',
}

function makeEvent(body: unknown, ip = '1.2.3.4') {
  mockGetRequestIP.mockReturnValue(ip)
  mockGetRequestHeader.mockReturnValue(null)
  mockReadBody.mockResolvedValue(body)
  return {} as Parameters<typeof handler>[0]
}

describe('POST /api/contact', () => {
  it('returns { success: true } for a valid body', async () => {
    const result = await handler(makeEvent(validBody, '10.0.0.1'))
    expect(result).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('contact_requests')
    expect(mockSendEmail).toHaveBeenCalled()
  })

  it('returns 400 when email is missing', async () => {
    const { email: _email, ...noEmail } = validBody
    await expect(handler(makeEvent(noEmail, '10.0.0.2'))).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('activityId is optional — succeeds without it', async () => {
    const result = await handler(makeEvent({ ...validBody, activityId: undefined }, '10.0.0.3'))
    expect(result).toEqual({ success: true })
  })

  it('rate-limits after 3 requests from the same IP', async () => {
    const ip = '77.77.77.77'
    const event = makeEvent(validBody, ip)
    await handler(event)
    await handler(event)
    await handler(event)
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 429 })
  })
})

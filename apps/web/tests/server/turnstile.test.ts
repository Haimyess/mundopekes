import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runtimeConfig, mockFetch } = vi.hoisted(() => ({
  runtimeConfig: { turnstileSecretKey: 'secret' } as Record<string, unknown>,
  mockFetch: vi.fn(),
}))

vi.mock('../../node_modules/nuxt/dist/app/nuxt.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRuntimeConfig: () => runtimeConfig,
}))

const h3 = await import('h3')
vi.stubGlobal('createError', h3.createError)
vi.stubGlobal('$fetch', mockFetch)
vi.stubGlobal('getRequestIP', () => '203.0.113.7')
vi.stubGlobal('logError', vi.fn().mockResolvedValue(undefined))

const { verifyTurnstileToken } = await import('../../server/utils/turnstile')
const event = {} as Parameters<typeof verifyTurnstileToken>[0]

describe('verifyTurnstileToken', () => {
  beforeEach(() => {
    runtimeConfig.turnstileSecretKey = 'secret'
    mockFetch.mockReset()
  })

  it('asks Cloudflare with the secret, the token and the client IP', async () => {
    mockFetch.mockResolvedValue({ success: true })
    await expect(verifyTurnstileToken(event, 'token')).resolves.toBe(true)
    const [url, options] = mockFetch.mock.calls[0]!
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    expect(Object.fromEntries(options.body)).toEqual({
      secret: 'secret',
      response: 'token',
      remoteip: '203.0.113.7',
    })
  })

  it('rejects invalid tokens and network failures', async () => {
    mockFetch.mockResolvedValueOnce({ success: false, 'error-codes': ['invalid-input-response'] })
    await expect(verifyTurnstileToken(event, 'bad')).resolves.toBe(false)
    mockFetch.mockRejectedValueOnce(new Error('timeout'))
    await expect(verifyTurnstileToken(event, 'token')).resolves.toBe(false)
  })

  it('fails closed when the secret is missing', async () => {
    runtimeConfig.turnstileSecretKey = ''
    await expect(verifyTurnstileToken(event, 'token')).rejects.toMatchObject({ statusCode: 503 })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

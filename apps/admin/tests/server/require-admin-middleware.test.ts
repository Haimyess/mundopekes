import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRequireAdminUser = vi.fn()
vi.stubGlobal('requireAdminUser', mockRequireAdminUser)
vi.stubGlobal('defineEventHandler', (fn: (e: unknown) => unknown) => fn)

const { default: middleware } = await import('../../server/middleware/require-admin')

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdminUser.mockResolvedValue({ id: 'admin-001', app_metadata: { role: 'admin' } })
})

describe('require-admin middleware', () => {
  it('checks admin auth for /api/** requests', async () => {
    await middleware({ path: '/api/suggestions' } as never)
    expect(mockRequireAdminUser).toHaveBeenCalledOnce()
  })

  it('skips the check for non-API requests (e.g. /login page render)', async () => {
    await middleware({ path: '/login' } as never)
    expect(mockRequireAdminUser).not.toHaveBeenCalled()
  })

  it('skips the check for internal module routes under /api/_* (e.g. @nuxt/icon)', async () => {
    await middleware({ path: '/api/_nuxt_icon/lucide.json?icons=lock' } as never)
    expect(mockRequireAdminUser).not.toHaveBeenCalled()
  })

  it('propagates the 401/403 thrown by requireAdminUser', async () => {
    const err = Object.assign(new Error('No autenticado'), { statusCode: 401 })
    mockRequireAdminUser.mockRejectedValue(err)

    await expect(middleware({ path: '/api/suggestions' } as never)).rejects.toMatchObject({
      statusCode: 401,
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockServerSupabaseUser, mockGetUser } = vi.hoisted(() => ({
  mockServerSupabaseUser: vi.fn(),
  mockGetUser: vi.fn(),
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
  serverSupabaseClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}))

const mockLogWarn = vi.fn()
vi.stubGlobal('logWarn', mockLogWarn)
vi.stubGlobal('getRequestIP', () => '1.2.3.4')

const { requireAdminUser } = await import('../../server/utils/auth')

const EVENT = { path: '/api/suggestions' } as Parameters<typeof requireAdminUser>[0]

const adminClaims = (aal: string) => ({ sub: 'admin-1', aal, app_metadata: { role: 'admin' } })

const userWithFactors = (statuses: string[]) => ({
  data: { user: { id: 'admin-1', factors: statuses.map((status) => ({ status })) } },
  error: null,
})

describe('requireAdminUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated requests with 401', async () => {
    mockServerSupabaseUser.mockResolvedValue(null)
    await expect(requireAdminUser(EVENT)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects non admin users with 403 and logs their id', async () => {
    mockServerSupabaseUser.mockResolvedValue({ sub: 'user-9', aal: 'aal1', app_metadata: {} })
    await expect(requireAdminUser(EVENT)).rejects.toMatchObject({ statusCode: 403 })
    expect(mockLogWarn).toHaveBeenCalledWith(
      EVENT,
      'security',
      expect.any(String),
      expect.objectContaining({ userId: 'user-9' })
    )
  })

  it('accepts an aal2 admin session without an extra auth call', async () => {
    mockServerSupabaseUser.mockResolvedValue(adminClaims('aal2'))
    await expect(requireAdminUser(EVENT)).resolves.toMatchObject({ sub: 'admin-1' })
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('accepts an aal1 admin that has no MFA factor enrolled', async () => {
    mockServerSupabaseUser.mockResolvedValue(adminClaims('aal1'))
    mockGetUser.mockResolvedValue(userWithFactors([]))
    await expect(requireAdminUser(EVENT)).resolves.toMatchObject({ sub: 'admin-1' })
  })

  it('ignores factors that were never verified', async () => {
    mockServerSupabaseUser.mockResolvedValue(adminClaims('aal1'))
    mockGetUser.mockResolvedValue(userWithFactors(['unverified']))
    await expect(requireAdminUser(EVENT)).resolves.toMatchObject({ sub: 'admin-1' })
  })

  it('rejects an aal1 session when the admin has a verified MFA factor', async () => {
    mockServerSupabaseUser.mockResolvedValue(adminClaims('aal1'))
    mockGetUser.mockResolvedValue(userWithFactors(['verified']))
    await expect(requireAdminUser(EVENT)).rejects.toMatchObject({ statusCode: 403 })
    expect(mockLogWarn).toHaveBeenCalledWith(
      EVENT,
      'security',
      'Admin request without completed MFA',
      expect.objectContaining({ userId: 'admin-1' })
    )
  })

  it('fails closed when the factors cannot be verified', async () => {
    mockServerSupabaseUser.mockResolvedValue(adminClaims('aal1'))
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('auth down') })
    await expect(requireAdminUser(EVENT)).rejects.toMatchObject({ statusCode: 503 })
  })
})

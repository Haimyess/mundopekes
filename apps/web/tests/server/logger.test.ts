import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn().mockReturnValue({ from: mockFrom }),
}))

const mockRuntimeConfig = vi.hoisted(() => vi.fn().mockReturnValue({ appName: 'web' }))

vi.mock('../../node_modules/nuxt/dist/app/nuxt.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRuntimeConfig: mockRuntimeConfig,
}))

const { logError, logWarn, logInfo } = await import('../../../../layers/core/server/utils/logger')

const mockEvent = {} as H3Event

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockRuntimeConfig.mockReturnValue({ appName: 'web' })
  })

  it('logError inserts with level="error"', async () => {
    await logError(mockEvent, 'test-context', 'something broke')
    expect(mockFrom).toHaveBeenCalledWith('app_logs')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error', context: 'test-context' })
    )
  })

  it('logWarn inserts with level="warn"', async () => {
    await logWarn(mockEvent, 'test-context', 'something is off')
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ level: 'warn' }))
  })

  it('logInfo inserts with level="info"', async () => {
    await logInfo(mockEvent, 'test-context', 'all good')
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ level: 'info' }))
  })

  it('does not throw if Supabase insert fails', async () => {
    mockInsert.mockRejectedValueOnce(new Error('DB down'))
    await expect(logError(mockEvent, 'ctx', 'msg')).resolves.toBeUndefined()
  })

  it('includes metadata in the insert', async () => {
    const meta = { userId: 'abc', extra: 42 }
    await logInfo(mockEvent, 'ctx', 'with meta', meta)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ metadata: meta }))
  })

  it('labels the log with the app name from runtime config', async () => {
    await logInfo(mockEvent, 'ctx', 'from web')
    expect(mockRuntimeConfig).toHaveBeenCalledWith(mockEvent)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ app: 'web' }))
  })

  it('labels admin logs as admin', async () => {
    mockRuntimeConfig.mockReturnValue({ appName: 'admin' })
    await logError(mockEvent, 'ctx', 'from admin')
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ app: 'admin' }))
  })
})

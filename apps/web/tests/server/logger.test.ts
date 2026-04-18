import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn().mockReturnValue({ from: mockFrom }),
}))

const { logError, logWarn, logInfo } = await import('../../server/utils/logger')

const mockEvent = {} as H3Event

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: mockInsert })
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
})

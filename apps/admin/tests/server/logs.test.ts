import { describe, it, expect, vi, beforeEach } from 'vitest'

let resolveValue = { data: [] as unknown[], count: 0, error: null }

const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockRange = vi.fn()
const mockSelect = vi.fn()

// Query builder que es thenable — igual al patrón de Supabase
const mockQueryBuilder = {
  select: mockSelect,
  order: mockOrder,
  range: mockRange,
  eq: mockEq,
  then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(resolveValue).then(onFulfilled),
  catch: (onRejected: (e: unknown) => unknown) => Promise.resolve(resolveValue).catch(onRejected),
}

mockSelect.mockReturnValue(mockQueryBuilder)
mockOrder.mockReturnValue(mockQueryBuilder)
mockRange.mockReturnValue(mockQueryBuilder)
mockEq.mockReturnValue(mockQueryBuilder)

const mockFrom = vi.fn(() => mockQueryBuilder)

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(() => ({ from: mockFrom })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  resolveValue = { data: [], count: 0, error: null }
  mockSelect.mockReturnValue(mockQueryBuilder)
  mockOrder.mockReturnValue(mockQueryBuilder)
  mockRange.mockReturnValue(mockQueryBuilder)
  mockEq.mockReturnValue(mockQueryBuilder)
  mockFrom.mockReturnValue(mockQueryBuilder)
})

describe('GET /api/logs', () => {
  it('retorna { data, count } con defaults', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({ page: '1', limit: '50' }))
    resolveValue = {
      data: [
        {
          id: '1',
          level: 'info',
          message: 'test',
          context: 'api',
          created_at: new Date().toISOString(),
        },
      ],
      count: 1,
      error: null,
    }

    const handler = (await import('../../server/api/logs/index.get')).default
    const result = await (handler as (e: unknown) => Promise<unknown>)({})

    expect(result).toMatchObject({ count: 1, page: 1 })
    expect(Array.isArray((result as { data: unknown[] }).data)).toBe(true)
  })

  it('aplica filtro por level cuando se especifica', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({ level: 'error' }))
    resolveValue = { data: [], count: 0, error: null }

    const handler = (await import('../../server/api/logs/index.get')).default
    await (handler as (e: unknown) => Promise<unknown>)({})

    expect(mockEq).toHaveBeenCalledWith('level', 'error')
  })
})

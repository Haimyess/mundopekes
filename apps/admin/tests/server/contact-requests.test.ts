import { describe, it, expect, vi, beforeEach } from 'vitest'

let resolveValue = { data: [] as unknown[], count: 0, error: null }
let resolveSingle = { data: null as unknown, error: null }

const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockRange = vi.fn()
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockSingle = vi.fn()

const mockQueryBuilder = {
  select: mockSelect,
  order: mockOrder,
  range: mockRange,
  eq: mockEq,
  update: mockUpdate,
  single: mockSingle,
  then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(resolveValue).then(onFulfilled),
  catch: (onRejected: (e: unknown) => unknown) => Promise.resolve(resolveValue).catch(onRejected),
}

mockSelect.mockReturnValue(mockQueryBuilder)
mockOrder.mockReturnValue(mockQueryBuilder)
mockRange.mockReturnValue(mockQueryBuilder)
mockEq.mockReturnValue(mockQueryBuilder)
mockUpdate.mockReturnValue(mockQueryBuilder)
mockSingle.mockImplementation(() => Promise.resolve(resolveSingle))

const mockFrom = vi.fn(() => mockQueryBuilder)

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(() => ({ from: mockFrom })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  resolveValue = { data: [], count: 0, error: null }
  resolveSingle = { data: null, error: null }
  mockSelect.mockReturnValue(mockQueryBuilder)
  mockOrder.mockReturnValue(mockQueryBuilder)
  mockRange.mockReturnValue(mockQueryBuilder)
  mockEq.mockReturnValue(mockQueryBuilder)
  mockUpdate.mockReturnValue(mockQueryBuilder)
  mockSingle.mockImplementation(() => Promise.resolve(resolveSingle))
  mockFrom.mockReturnValue(mockQueryBuilder)
})

describe('GET /api/contact-requests', () => {
  it('retorna { data, count } con defaults', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({ page: '1' }))
    resolveValue = {
      data: [
        {
          id: '1',
          intent: 'feedback',
          status: 'pending',
          name: 'Test',
          email: 'test@test.com',
          message: 'msg',
          created_at: new Date().toISOString(),
        },
      ],
      count: 1,
      error: null,
    }

    const handler = (await import('../../server/api/contact-requests/index.get')).default
    const result = await (handler as (e: unknown) => Promise<unknown>)({})

    expect(result).toMatchObject({ count: 1, page: 1 })
    expect(Array.isArray((result as { data: unknown[] }).data)).toBe(true)
  })
})

describe('PATCH /api/contact-requests/[id]', () => {
  it('actualiza el status correctamente', async () => {
    vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('test-id'))
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ status: 'read' }))
    resolveSingle = { data: { id: 'test-id', status: 'read' }, error: null }

    const handler = (await import('../../server/api/contact-requests/[id].patch')).default
    const result = await (handler as (e: unknown) => Promise<unknown>)({})

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'read' })
    expect((result as { status: string }).status).toBe('read')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VALIDATION_ERRORS } from '@mundopekes/schemas'

const mockSingle = vi.fn()
const mockQueryBuilder: Record<string, unknown> = {}
for (const method of ['select', 'eq', 'update']) {
  mockQueryBuilder[method] = vi.fn(() => mockQueryBuilder)
}
mockQueryBuilder.single = mockSingle
const mockFrom = vi.fn(() => mockQueryBuilder)

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(() => ({ from: mockFrom })),
}))

const mockReadBody = vi.fn()
vi.stubGlobal('readBody', mockReadBody)
vi.stubGlobal('getRouterParam', () => 'provider-1')
vi.stubGlobal('escapeHtml', (value: string) => value)

const { default: handler } = await import('../../server/api/providers/[id].patch')

const callWith = (body: unknown) => {
  mockReadBody.mockResolvedValue(body)
  return handler({} as Parameters<typeof handler>[0])
}

describe('PATCH /api/providers/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSingle
      .mockResolvedValueOnce({ data: { name: 'Kids Park', email: 'p@kids.co.il' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'provider-1', status: 'suspended' }, error: null })
  })

  it('updates the provider with a valid review status', async () => {
    await expect(callWith({ status: 'suspended', notes: 'duplicated' })).resolves.toEqual({
      id: 'provider-1',
      status: 'suspended',
    })
    expect(mockQueryBuilder.update).toHaveBeenCalledWith({
      status: 'suspended',
      notes: 'duplicated',
    })
  })

  it.each(['pending', 'deleted', undefined])(
    'rejects the status %s before touching the database',
    async (status) => {
      await expect(callWith({ status })).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: VALIDATION_ERRORS.invalidOption,
      })
      expect(mockFrom).not.toHaveBeenCalled()
    }
  )
})

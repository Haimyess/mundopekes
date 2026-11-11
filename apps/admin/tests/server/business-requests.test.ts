import { beforeEach, describe, expect, it, vi } from 'vitest'

const ID = '7b0c3f5e-9a55-4c63-8a51-3f8f7c1c2d4e'

let listResult: { data: unknown[] | null; count: number | null; error: unknown } = {
  data: [],
  count: 0,
  error: null,
}
let updateResult: { data: unknown; error: unknown } = { data: null, error: null }
let query: Record<string, unknown> = {}
let body: unknown = {}
let routeId: string | undefined = ID

const calls = { eq: vi.fn(), range: vi.fn(), update: vi.fn() }

function builder() {
  const node: Record<string, unknown> = {
    select: () => node,
    order: () => node,
    range: (from: number, to: number) => {
      calls.range(from, to)
      return node
    },
    eq: (column: string, value: unknown) => {
      calls.eq(column, value)
      return node
    },
    update: (values: unknown) => {
      calls.update(values)
      return node
    },
    maybeSingle: () => Promise.resolve(updateResult),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(listResult).then(resolve),
  }
  return node
}

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(() => ({ from: () => builder() })),
}))

const h3 = await import('h3')
vi.stubGlobal('defineEventHandler', h3.defineEventHandler)
vi.stubGlobal('createError', h3.createError)
vi.stubGlobal('getQuery', () => query)
vi.stubGlobal('readBody', async () => body)
vi.stubGlobal('getRouterParam', () => routeId)
vi.stubGlobal('logError', vi.fn().mockResolvedValue(undefined))
vi.stubGlobal('logInfo', vi.fn().mockResolvedValue(undefined))

const { default: list } = await import('../../server/api/business-requests/index.get')
const { default: patch } = await import('../../server/api/business-requests/[id].patch')
const event = {} as Parameters<typeof list>[0]

const failure = async (run: () => Promise<unknown>) => {
  try {
    await run()
  } catch (error) {
    return error as { statusCode: number }
  }
  throw new Error('expected a failure')
}

beforeEach(() => {
  query = {}
  body = {}
  routeId = ID
  listResult = { data: [{ id: ID }], count: 41, error: null }
  updateResult = { data: { id: ID, status: 'contacted' }, error: null }
  Object.values(calls).forEach((call) => call.mockReset())
})

describe('GET /api/business-requests', () => {
  it('paginates and reports the total pages', async () => {
    query = { page: '3' }
    await expect(list(event)).resolves.toEqual({
      data: [{ id: ID }],
      count: 41,
      page: 3,
      totalPages: 3,
    })
    expect(calls.range).toHaveBeenCalledWith(40, 59)
  })

  it('filters by known kind and status only', async () => {
    query = { kind: 'claim', status: 'pending' }
    await list(event)
    expect(calls.eq.mock.calls).toEqual([
      ['kind', 'claim'],
      ['status', 'pending'],
    ])
    calls.eq.mockReset()
    query = { kind: 'drop table', status: 'read' }
    await list(event)
    expect(calls.eq).not.toHaveBeenCalled()
  })

  it('answers 500 when the database fails', async () => {
    listResult = { data: null, count: null, error: { message: 'boom' } }
    expect((await failure(() => list(event))).statusCode).toBe(500)
  })
})

describe('PATCH /api/business-requests/:id', () => {
  it('updates the status and notes', async () => {
    body = { status: 'contacted', notes: '  Llamé el martes ' }
    await expect(patch(event)).resolves.toEqual({ id: ID, status: 'contacted' })
    expect(calls.update).toHaveBeenCalledWith({ status: 'contacted', notes: 'Llamé el martes' })
    expect(calls.eq).toHaveBeenCalledWith('id', ID)
  })

  it('keeps the notes when only the status changes', async () => {
    body = { status: 'approved' }
    await patch(event)
    expect(calls.update).toHaveBeenCalledWith({ status: 'approved' })
  })

  it('rejects invalid ids and statuses', async () => {
    routeId = 'nope'
    body = { status: 'approved' }
    expect((await failure(() => patch(event))).statusCode).toBe(400)
    routeId = ID
    body = { status: 'read' }
    expect((await failure(() => patch(event))).statusCode).toBe(400)
  })

  it('answers 404 when the request does not exist', async () => {
    body = { status: 'rejected' }
    updateResult = { data: null, error: null }
    expect((await failure(() => patch(event))).statusCode).toBe(404)
  })
})

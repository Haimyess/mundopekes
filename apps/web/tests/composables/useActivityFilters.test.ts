import { beforeEach, describe, expect, it, vi } from 'vitest'

interface QueryResult {
  data: unknown[]
  error: null
  count: number
}

const QUERY_RESULT: QueryResult = { data: [], error: null, count: 7 }

const createBuilder = () => {
  const calls: { method: string; args: unknown[] }[] = []
  const builder: Record<string, unknown> = {}
  const chain =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args })
      return builder
    }
  for (const method of ['select', 'eq', 'in', 'or', 'lte', 'gte', 'order']) {
    builder[method] = chain(method)
  }
  builder.range = (...args: unknown[]) => {
    calls.push({ method: 'range', args })
    return Promise.resolve(QUERY_RESULT)
  }
  builder.then = (resolve: (value: QueryResult) => unknown) => {
    calls.push({ method: 'execute', args: [] })
    return Promise.resolve(QUERY_RESULT).then(resolve)
  }
  return { builder, calls }
}

let activeBuilder = createBuilder()

vi.mock(
  '../../node_modules/@nuxtjs/supabase/dist/runtime/composables/useSupabaseClient.js',
  () => ({
    useSupabaseClient: () => ({ from: () => activeBuilder.builder }),
  })
)
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/app/stores/activities', () => ({
  useActivitiesStore: () => ({ filterOptions: { cities: [], ageRanges: [], seasons: [] } }),
}))

const { useActivityFilters } = await import('~/app/composables/useActivityFilters')

describe('useActivityFilters', () => {
  beforeEach(() => {
    activeBuilder = createBuilder()
  })

  it('paginates filtered results with range instead of executing the query early', async () => {
    const { fetchFilteredActivitiesPaginated } = useActivityFilters()

    const result = await fetchFilteredActivitiesPaginated({ is_free: true }, 2, 20)

    expect(result).toEqual({ data: [], total: 7 })
    const methods = activeBuilder.calls.map((call) => call.method)
    expect(methods).not.toContain('execute')
    expect(activeBuilder.calls.find((call) => call.method === 'range')?.args).toEqual([20, 39])
  })

  it('executes the unpaginated query exactly once', async () => {
    const { fetchFilteredActivities } = useActivityFilters()

    const result = await fetchFilteredActivities({ is_free: true })

    expect(result).toEqual([])
    expect(activeBuilder.calls.filter((call) => call.method === 'execute')).toHaveLength(1)
    expect(activeBuilder.calls.some((call) => call.method === 'range')).toBe(false)
  })
})

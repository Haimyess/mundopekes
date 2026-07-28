import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncActivityPivots } from '../../server/utils/activity-pivots'
import type { SupabaseClient } from '@supabase/supabase-js'

// Mock supabase encadenable que registra inserts y resuelve seasons select→in.
function makeMockSupabase(seasonRows: { id: number; value: string }[]) {
  const inserts: Record<string, unknown[]> = {}
  const deletes: string[] = []

  const from = vi.fn((table: string) => {
    return {
      delete: () => ({
        eq: (_col: string, _val: string) => {
          deletes.push(table)
          return Promise.resolve({ error: null })
        },
      }),
      insert: (rows: unknown[]) => {
        inserts[table] = rows
        return Promise.resolve({ error: null })
      },
      select: (_cols: string) => ({
        in: (_col: string, _vals: string[]) => Promise.resolve({ data: seasonRows }),
      }),
    }
  })

  return { client: { from } as unknown as SupabaseClient, inserts, deletes }
}

describe('syncActivityPivots', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes and re-inserts age range rows', async () => {
    const { client, inserts, deletes } = makeMockSupabase([])
    await syncActivityPivots(client, 'act-1', [1, 3], undefined)
    expect(deletes).toContain('activity_age_ranges')
    expect(inserts['activity_age_ranges']).toEqual([
      { activity_id: 'act-1', age_range_id: 1 },
      { activity_id: 'act-1', age_range_id: 3 },
    ])
  })

  it('maps season VALUES to season_id rows', async () => {
    const { client, inserts } = makeMockSupabase([
      { id: 10, value: 'spring' },
      { id: 20, value: 'summer' },
    ])
    await syncActivityPivots(client, 'act-1', undefined, ['spring', 'summer'])
    expect(inserts['activity_seasons']).toEqual([
      { activity_id: 'act-1', season_id: 10 },
      { activity_id: 'act-1', season_id: 20 },
    ])
  })

  it('ignores the "all" season value', async () => {
    const { client, inserts, deletes } = makeMockSupabase([])
    await syncActivityPivots(client, 'act-1', undefined, ['all'])
    expect(deletes).toContain('activity_seasons')
    // No season rows inserted (only 'all' which is filtered out)
    expect(inserts['activity_seasons']).toBeUndefined()
  })

  it('clears pivots when given empty arrays', async () => {
    const { client, inserts, deletes } = makeMockSupabase([])
    await syncActivityPivots(client, 'act-1', [], [])
    expect(deletes).toContain('activity_age_ranges')
    expect(deletes).toContain('activity_seasons')
    expect(inserts['activity_age_ranges']).toBeUndefined()
    expect(inserts['activity_seasons']).toBeUndefined()
  })

  it('does nothing for undefined arrays (partial update)', async () => {
    const { client, deletes } = makeMockSupabase([])
    await syncActivityPivots(client, 'act-1', undefined, undefined)
    expect(deletes).toHaveLength(0)
  })
})

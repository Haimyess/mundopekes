// Searches MundoPekes' OWN `activities` table, scoped to a single place —
// this is the "does this place already offer this activity?" lookup used by
// the suggestion wizard's activity step (step 2), so a user proposing a new
// experience for an existing place can reuse an activity that's already
// there instead of creating a duplicate. Only meaningful when a place is
// already known (existing place match) — a brand-new place can't have any
// activities yet, so the wizard skips calling this in that case.
import { serverSupabaseClient } from '#supabase/server'

export interface LocalActivitySearchResult {
  id: string
  title_i18n: Record<string, string>
  category_id: string | null
}

interface ActivityRow {
  id: string
  title_i18n: Record<string, string>
  category_id: string | null
}

export default defineEventHandler(async (event) => {
  await checkRateLimit(event, 'activities/local-search', { limit: 30, windowSeconds: 60 })

  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const placeId = typeof query.place_id === 'string' ? query.place_id : ''

  if (!placeId) {
    throw createError({ statusCode: 400, statusMessage: 'place_id es requerido' })
  }

  if (q.length < 2) {
    return { activities: [] }
  }

  const normalized = normalizeName(q)
  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('activities')
    .select('id, title_i18n, category_id')
    .eq('place_id', placeId)
    .in('status', ['pending', 'approved'])
    .limit(20)

  if (error) {
    await logError(event, 'activities/local-search', 'Failed to search activities', {
      placeId,
      q,
      error: error.message,
    })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // Filtered in JS (not ilike on a jsonb column) — activity counts per place
  // are small, so this is cheap, and it lets us match against any locale.
  const activities: LocalActivitySearchResult[] = ((data ?? []) as unknown as ActivityRow[])
    .filter((row) => {
      const title = Object.values(row.title_i18n ?? {}).find((v) => v) ?? ''
      return normalizeName(title).includes(normalized)
    })
    .slice(0, 8)
    .map((row) => ({ id: row.id, title_i18n: row.title_i18n, category_id: row.category_id }))

  return { activities }
})

// server/api/suggestions/index.get.ts
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const query = getQuery(event)

  // Paginación opcional — sin page/pageSize devuelve todo (retrocompat)
  const hasPagination = query.page !== undefined || query.pageSize !== undefined
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Join the linked place when suggestion_type === 'experience_for_existing_place'
  // — that branch always stores name_i18n: {} and location: null on the
  // suggestion itself (the place already has its own name/location; see
  // apps/web/server/api/suggestions/index.post.ts), so the table/edit-drawer
  // need this fallback to show anything for those rows.
  let q = supabase
    .from('suggestions')
    .select('*, place:places!suggestions_place_id_fkey(id, name_i18n, city:cities(name))', {
      count: hasPagination ? 'exact' : undefined,
    })
    .order('created_at', { ascending: false })

  // Filtro por status opcional: /api/suggestions?status=pending
  if (query.status) {
    q = q.eq('status', query.status as string)
  }
  if (query.category_id) {
    q = q.eq('category_id', query.category_id as string)
  }
  if (query.city) {
    q = q.eq('location->>city', query.city as string)
  }
  if (query.is_free !== undefined && query.is_free !== '') {
    q = q.eq('is_free', query.is_free === 'true')
  }
  if (query.suggestion_type) {
    q = q.eq('suggestion_type', query.suggestion_type as string)
  }
  if (query.flagged_possible_duplicate !== undefined && query.flagged_possible_duplicate !== '') {
    q = q.eq('flagged_possible_duplicate', query.flagged_possible_duplicate === 'true')
  }

  if (hasPagination) {
    q = q.range(from, to)
  }

  const { data, error, count } = await q
  if (error) throw createError({ statusCode: 500, message: error.message })

  if (hasPagination) {
    return { data: data ?? [], count: count ?? 0 }
  }
  return data
})

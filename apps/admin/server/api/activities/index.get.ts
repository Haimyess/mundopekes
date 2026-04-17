import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const supabase = await serverSupabaseClient(event)

  // Paginación opcional — si no llega `page`, devuelve todo (retrocompat con places/[id].vue)
  const hasPagination = query.page !== undefined || query.pageSize !== undefined
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let req = supabase
    .from('activities')
    .select(
      `
      *,
      place:places(id, name, city:cities(name)),
      category:categories(id, name, slug),
      activity_age_ranges(age_range:age_ranges(*)),
      activity_seasons(season:seasons(*))
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (query.place_id)    req = req.eq('place_id', query.place_id)
  if (query.category_id) req = req.eq('category_id', query.category_id)
  if (query.status)      req = req.eq('status', query.status)
  if (query.is_free !== undefined && query.is_free !== '') {
    req = req.eq('is_free', query.is_free === 'true')
  }
  if (query.q) req = req.ilike('title', `%${query.q}%`)

  if (hasPagination) {
    req = req.range(from, to)
  }

  const { data, error, count } = await req

  if (error) throw createError({ statusCode: 500, message: error.message })

  // Si hay paginación, devuelve objeto. Si no, devuelve array (retrocompat).
  if (hasPagination) {
    return { data: data ?? [], count: count ?? 0 }
  }
  return data
})
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const query = getQuery(event)

  // Paginación opcional — sin page/pageSize devuelve todo (retrocompat con
  // el selector de lugares en activities/index.vue)
  const hasPagination = query.page !== undefined || query.pageSize !== undefined
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let req = supabase
    .from('places')
    .select(
      `
      *,
      city:cities(id, name, region),
      activities(count)
    `,
      { count: hasPagination ? 'exact' : undefined }
    )
    .order('created_at', { ascending: false })

  if (query.q) req = req.ilike('name_i18n->>es', `%${query.q}%`)
  if (query.status) req = req.eq('status', query.status as string)

  // .eq('city.name', ...) on an embedded resource doesn't filter the parent
  // rows in PostgREST/supabase-js without an !inner join — resolve the city
  // name to its id first and filter on the real column instead.
  if (query.city) {
    const { data: cityRow } = await supabase
      .from('cities')
      .select('id')
      .eq('name', query.city as string)
      .maybeSingle()
    req = req.eq('city_id', cityRow?.id ?? -1)
  }

  if (hasPagination) {
    req = req.range(from, to)
  }

  const { data, error, count } = await req

  if (error) throw createError({ statusCode: 500, message: error.message })

  if (hasPagination) {
    return { data: data ?? [], count: count ?? 0 }
  }
  return data
})

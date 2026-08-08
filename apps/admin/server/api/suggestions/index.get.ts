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

  let q = supabase
    .from('suggestions')
    .select('*', { count: hasPagination ? 'exact' : undefined })
    .order('created_at', { ascending: false })

  // Filtro por status opcional: /api/suggestions?status=pending
  if (query.status) {
    q = q.eq('status', query.status as string)
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

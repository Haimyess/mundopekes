import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole<Database>(event)
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const from = (page - 1) * limit
  const to = from + limit - 1

  let req = supabase
    .from('providers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (query.status && query.status !== 'all') {
    req = req.eq('status', query.status as 'pending' | 'active' | 'suspended' | 'rejected')
  }

  const { data, count, error } = await req

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    data: data ?? [],
    count: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
})

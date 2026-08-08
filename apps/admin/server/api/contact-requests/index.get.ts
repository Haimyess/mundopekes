import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const from = (page - 1) * limit
  const to = from + limit - 1

  const supabase = serverSupabaseServiceRole<Database>(event)

  let req = supabase
    .from('contact_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (query.intent) req = req.eq('intent', query.intent as string)
  if (query.status) req = req.eq('status', query.status as string)

  const { data, error, count } = await req
  if (error) throw createError({ statusCode: 500, message: error.message })

  const totalPages = Math.ceil((count ?? 0) / limit)
  return { data: data ?? [], count: count ?? 0, page, totalPages }
})

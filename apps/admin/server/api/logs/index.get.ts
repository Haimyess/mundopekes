import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(200, Math.max(1, Number(query.limit) || 50))
  const from = (page - 1) * limit
  const to = from + limit - 1

  const supabase = serverSupabaseServiceRole<Database>(event)

  let req = supabase
    .from('app_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (query.level) req = req.eq('level', query.level as string)
  if (query.context) req = req.eq('context', query.context as string)

  const { data, error, count } = await req
  if (error) throw createError({ statusCode: 500, message: error.message })

  const totalPages = Math.ceil((count ?? 0) / limit)
  return { data: data ?? [], count: count ?? 0, page, totalPages }
})

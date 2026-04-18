// server/api/suggestions/index.get.ts
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const query = getQuery(event)

  let q = supabase
    .from('suggestions')
    .select('*')
    .order('created_at', { ascending: false })

  // Filtro por status opcional: /api/suggestions?status=pending
  if (query.status) {
    q = q.eq('status', query.status as string)
  }

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})

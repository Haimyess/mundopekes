// server/api/faqs/index.get.ts
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)

  let q = supabase
    .from('faqs')
    .select('*, faq_category:faq_categories(id, name, slug)')
    .order('order', { ascending: true })

  if (query.status) q = q.eq('status', query.status as string)
  if (query.faq_category_id) q = q.eq('faq_category_id', query.faq_category_id as string)

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})

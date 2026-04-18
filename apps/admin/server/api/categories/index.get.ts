// server/api/categories/index.get.ts
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event)

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('order', { ascending: true })

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})

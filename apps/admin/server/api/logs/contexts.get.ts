import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase
    .from('app_logs')
    .select('context')
    .order('context', { ascending: true })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return [...new Set(data?.map((r) => r.context) ?? [])]
})

import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const supabase = serverSupabaseServiceRole<Database>(event)
  const id = getRouterParam(event, 'id')

  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing provider id' })

  const { data, error } = await supabase.from('providers').select('*').eq('id', id).single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Provider not found' })

  return data
})

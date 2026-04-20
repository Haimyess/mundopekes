import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.from('cities').select('id, name').order('name')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
})

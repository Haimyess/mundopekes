import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('activities')
    .insert(body)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
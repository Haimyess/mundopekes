import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const body = await readBody(event)
  const client = await serverSupabaseClient(event)
  const supabase = client as any

  const { data, error } = await supabase
    .from('places')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
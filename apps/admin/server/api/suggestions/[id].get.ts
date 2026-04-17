// server/api/suggestions/[id].get.ts
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const supabase = await serverSupabaseClient(event)
  const { data, error } = await supabase
    .from('suggestions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw createError({ statusCode: 404, message: 'Sugerencia no encontrada' })
  return data
})
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const supabase = await serverSupabaseClient(event)

  const { error } = await supabase.from('activities').delete().eq('id', id)

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { success: true }
})

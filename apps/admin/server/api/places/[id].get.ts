import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })
  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('places')
    .select(
      `
      *,
      city:cities(id, name, region)
    `
    )
    .eq('id', id)
    .single()

  if (error) {
    console.error('[places/[id].get]', error.message)
    const status = error.code === 'PGRST116' ? 404 : 500
    throw createError({ statusCode: status, message: error.message })
  }
  return data
})

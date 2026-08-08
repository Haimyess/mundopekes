import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })
  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('activities')
    .select(
      `
      *,
      place:places(id, name, city:cities(name)),
      category:categories(id, name, slug),
      activity_age_ranges(age_range:age_ranges(*)),
      activity_seasons(season:seasons(*))
    `
    )
    .eq('id', id)
    .single()

  if (error) throw createError({ statusCode: 404, message: 'Actividad no encontrada' })
  return data
})

import { serverSupabaseClient } from '#supabase/server'

// El único consumidor de este GET singular es SuggestionsSlideover.vue, que
// sólo necesita id + título para mostrarlo en un aviso de "posible
// duplicado" (ver ActivityLite ahí) — no la actividad completa con sus 4
// joins. Editar una actividad no pasa por acá: ActivitiesSlideover recibe el
// row ya cargado de la lista (ver activities/index.vue) como prop.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })
  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('activities')
    .select('id, title_i18n')
    .eq('id', id)
    .single()

  if (error) throw createError({ statusCode: 404, message: 'Actividad no encontrada' })
  return data
})

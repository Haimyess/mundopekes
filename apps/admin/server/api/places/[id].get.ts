import { serverSupabaseClient } from '#supabase/server'

// Este GET singular lo usa tanto la página de detalle (places/[id].vue, que
// necesita el lugar completo) como SuggestionsSlideover.vue (que sólo
// necesita id/name_i18n/images para mostrar el lugar vinculado o el posible
// duplicado — ver PlaceLite ahí). ?lite=1 pide sólo esos campos, para no
// pagar el resto del row/join cuando no hace falta.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })
  const supabase = await serverSupabaseClient(event)
  const { lite } = getQuery(event)

  const { data, error } = await supabase
    .from('places')
    .select(
      lite === '1' || lite === 'true'
        ? 'id, name_i18n, images'
        : `
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

import { serverSupabaseClient } from '#supabase/server'
import type { Database, Json, TablesInsert, TablesUpdate, Tables } from '~/types/database.types'

type Suggestion = Tables<'suggestions'>
type SuggestionLocation = { city?: string, region?: string, address?: string }

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const supabase = await serverSupabaseClient<Database>(event)

  // Cast explícito al tipo correcto
  const { data, error: fetchError } = await supabase
    .from('suggestions')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !data) {
    throw createError({ statusCode: 404, message: 'Sugerencia no encontrada' })
  }

  const suggestion = data as Suggestion

  if (suggestion.status !== 'pending') {
    throw createError({ statusCode: 400, message: 'Solo se pueden aprobar sugerencias pendientes' })
  }

  const location = suggestion.location as SuggestionLocation | null
  let cityId: number | null = null

  if (location?.city) {
    const { data: existingCity } = await supabase
      .from('cities')
      .select('id')
      .ilike('name', location.city)
      .single()

    if (existingCity) {
      cityId = existingCity.id
    } else {
      const { data: newCity } = await supabase
        .from('cities')
        .insert({ name: location.city } satisfies TablesInsert<'cities'>)
        .select('id')
        .single()
      cityId = newCity?.id ?? null
    }
  }

  const metadata: Json = {
    from_suggestion_id: id,
    address: location?.address ?? null,
    age_range: suggestion.age_range,
    type: suggestion.type as unknown as Json,
    best_season: suggestion.best_season as unknown as Json,
    stroller_friendly: suggestion.stroller_friendly,
    open_weekends: suggestion.open_weekends,
    is_free: suggestion.is_free,
    schedule: suggestion.schedule
  }

  const placeInsert: TablesInsert<'places'> = {
    name: suggestion.name,
    description: suggestion.description,
    city_id: cityId,
    images: suggestion.images,
    status: 'active',
    metadata
  }

  const { data: place, error: placeError } = await supabase
    .from('places')
    .insert(placeInsert)
    .select()
    .single()

  if (placeError) {
    throw createError({ statusCode: 500, message: `Error creando lugar: ${placeError.message}` })
  }

  const suggestionUpdate: TablesUpdate<'suggestions'> = {
    status: 'approved',
    reviewed_at: new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from('suggestions')
    .update(suggestionUpdate)
    .eq('id', id)

  if (updateError) {
    throw createError({ statusCode: 500, message: `Error actualizando sugerencia: ${updateError.message}` })
  }

  return { success: true, place, suggestion_id: id }
})

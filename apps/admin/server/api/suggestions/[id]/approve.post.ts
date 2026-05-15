import { createClient } from '@supabase/supabase-js'
import { enrichI18nField } from '../../../utils/translate'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const config = useRuntimeConfig(event)

  // Use service role for cross-table writes
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )

  // 1. Fetch suggestion
  const { data: suggestion, error: fetchError } = await supabase
    .from('suggestions')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !suggestion) {
    await logError(event, 'suggestions/approve', 'Suggestion not found', { id })
    throw createError({ statusCode: 404, message: 'Sugerencia no encontrada' })
  }

  if (suggestion.status !== 'pending') {
    await logWarn(event, 'suggestions/approve', 'Suggestion already processed', {
      id,
      status: suggestion.status,
    })
    throw createError({ statusCode: 400, message: `La sugerencia ya fue ${suggestion.status}` })
  }

  await logInfo(event, 'suggestions/approve', 'Approving suggestion', {
    id,
    name: suggestion.name_i18n,
  })

  type SuggestionMeta = {
    google_place_id?: string | null
    phone?: string | null
    website?: string | null
    schedule_structured?: unknown
  }
  type SuggestionAgeRange = { ids?: number[] }
  const meta = (suggestion.metadata as SuggestionMeta | null) ?? {}
  const ageRange = (suggestion.age_range as SuggestionAgeRange | null) ?? {}

  // 2. Enrich name_i18n
  const rawName = (suggestion.name_i18n as Record<string, string>) ?? {}
  const name_i18n = config.deeplApiKey
    ? await enrichI18nField(rawName, config.deeplApiKey as string)
    : rawName

  // 3. Enrich description_i18n
  const rawDesc = (suggestion.description_i18n as Record<string, string>) ?? {}
  const description_i18n =
    config.deeplApiKey && Object.keys(rawDesc).length > 0
      ? await enrichI18nField(rawDesc, config.deeplApiKey as string)
      : rawDesc

  // 4. Resolve city_id — upsert if not found
  const location = suggestion.location as {
    city?: string
    address?: string
    lat?: number
    lng?: number
  } | null
  let city_id: number | null = null

  if (location?.city) {
    const { data: existingCity } = await supabase
      .from('cities')
      .select('id')
      .ilike('name', location.city)
      .single()

    if (existingCity) {
      city_id = existingCity.id
    } else {
      const { data: newCity } = await supabase
        .from('cities')
        .insert({ name: location.city })
        .select('id')
        .single()
      city_id = newCity?.id ?? null
    }
  }

  // 5. Create Place
  const placePayload = {
    name_i18n,
    description_i18n: Object.keys(description_i18n).length > 0 ? description_i18n : null,
    city_id,
    lat: location?.lat ?? null,
    lng: location?.lng ?? null,
    images: (suggestion.images as string[]) ?? [],
    status: 'active',
    metadata: {
      google_place_id: meta.google_place_id ?? null,
      phone: meta.phone ?? null,
      website: meta.website ?? null,
      from_suggestion: id,
    },
  }

  const { data: place, error: placeError } = await supabase
    .from('places')
    .insert(placePayload)
    .select()
    .single()

  if (placeError || !place) {
    await logError(event, 'suggestions/approve', 'Failed to create place', {
      id,
      error: placeError?.message,
    })
    throw createError({ statusCode: 500, message: `Error creando lugar: ${placeError?.message}` })
  }

  // 6. Create Activity — title_i18n derived from name_i18n, admin can refine later
  const activityPayload = {
    place_id: place.id,
    category_id: suggestion.category_id ?? null,
    title_i18n: { ...name_i18n },
    description_i18n: Object.keys(description_i18n).length > 0 ? description_i18n : null,
    is_free: suggestion.is_free ?? true,
    stroller_friendly: suggestion.stroller_friendly ?? false,
    open_weekends: suggestion.open_weekends ?? false,
    schedule: (suggestion.schedule as string) ?? null,
    images: (suggestion.images as string[]) ?? [],
    status: 'approved',
    metadata: {
      from_suggestion: id,
      schedule_structured: meta.schedule_structured ?? null,
      age_range_ids: ageRange.ids ?? [],
    },
  }

  const { data: activity, error: activityError } = await supabase
    .from('activities')
    .insert(activityPayload)
    .select()
    .single()

  if (activityError || !activity) {
    await supabase.from('places').delete().eq('id', place.id)
    await logError(event, 'suggestions/approve', 'Failed to create activity — place rolled back', {
      id,
      place_id: place.id,
      error: activityError?.message,
    })
    throw createError({
      statusCode: 500,
      message: `Error creando actividad: ${activityError?.message}`,
    })
  }

  // 7. Insert age range pivot rows
  const ageRangeIds = ageRange.ids ?? []
  if (ageRangeIds.length > 0) {
    await supabase
      .from('activity_age_ranges')
      .insert(
        ageRangeIds.map((age_range_id: number) => ({ activity_id: activity.id, age_range_id }))
      )
  }

  // 8. Insert season pivot rows
  const bestSeasons = (suggestion.best_season as string[]) ?? []
  if (bestSeasons.length > 0) {
    const { data: seasonData } = await supabase
      .from('seasons')
      .select('id, value')
      .in('value', bestSeasons)

    if (seasonData?.length) {
      await supabase.from('activity_seasons').insert(
        seasonData.map((s: { id: number; value: string }) => ({
          activity_id: activity.id,
          season_id: s.id,
        }))
      )
    }
  }

  // 9. Mark suggestion as approved
  await supabase
    .from('suggestions')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', id)

  await logInfo(event, 'suggestions/approve', 'Suggestion approved successfully', {
    id,
    place_id: place.id,
    activity_id: activity.id,
  })

  return { place, activity }
})

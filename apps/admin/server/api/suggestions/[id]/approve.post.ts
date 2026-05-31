import { createClient } from '@supabase/supabase-js'
import { useRuntimeConfig } from 'nuxt/app'
import { enrichI18nField } from '../../../utils/translate'

// Full shape of suggestion.metadata as written by the wizard (Fase 6)
type SuggestionMeta = {
  // Google Place identifiers
  google_place_id?: string | null
  place_photo_url?: string | null
  google_types?: string[] | null
  // Editable place info
  google_url?: string | null
  phone?: string | null
  website?: string | null
  wheelchair?: boolean | null
  opening_hours_text?: string[] | null
  photos?: string[] | null
  // Activity
  generated_title?: string | null
  custom_activity?: string | null
  title_i18n?: Record<string, string> | null
  // Details
  has_shadow?: boolean | null
  has_bathrooms?: boolean | null
  price?: number | null
  // Schedule
  hours_unknown?: boolean | null
  schedule_structured?: unknown
  age_range_ids?: number[]
}

type SuggestionAgeRange = { ids?: number[] }

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const config = useRuntimeConfig(event)

  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )

  // ── 1. Fetch suggestion ────────────────────────────────────────────────
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

  const meta = (suggestion.metadata as SuggestionMeta | null) ?? {}
  const ageRange = (suggestion.age_range as SuggestionAgeRange | null) ?? {}

  // ── 2. Enrich place name ───────────────────────────────────────────────
  const rawName = (suggestion.name_i18n as Record<string, string>) ?? {}
  const name_i18n = config.deeplApiKey
    ? await enrichI18nField(rawName, config.deeplApiKey as string)
    : rawName

  // ── 3. Enrich place description ────────────────────────────────────────
  const rawDesc = (suggestion.description_i18n as Record<string, string>) ?? {}
  const description_i18n =
    config.deeplApiKey && Object.keys(rawDesc).length > 0
      ? await enrichI18nField(rawDesc, config.deeplApiKey as string)
      : rawDesc

  // ── 4. Enrich activity title (distinct from place name) ────────────────
  // Source: metadata.title_i18n (set by the wizard). Falls back to name_i18n
  // only when absent (legacy suggestions that predate Phase 3).
  const rawTitle =
    meta.title_i18n && Object.keys(meta.title_i18n).length > 0 ? meta.title_i18n : null
  const title_i18n: Record<string, string> = rawTitle
    ? config.deeplApiKey
      ? await enrichI18nField(rawTitle, config.deeplApiKey as string)
      : rawTitle
    : { ...name_i18n } // fallback: use place name

  // ── 5. Resolve city_id — upsert if not found ──────────────────────────
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

  // ── 6. Resolve coordinates (geocoding fallback for manual entries) ──────
  let lat: number | null = location?.lat ?? null
  let lng: number | null = location?.lng ?? null

  if (lat === null) {
    const geoQuery = [location?.address, location?.city].filter(Boolean).join(', ')
    if (geoQuery) {
      const coords = await geocodeAddress(geoQuery)
      if (coords) {
        lat = coords.lat
        lng = coords.lng
        await logInfo(event, 'suggestions/approve', 'Geocoded missing coordinates', { lat, lng })
      } else {
        await logWarn(
          event,
          'suggestions/approve',
          'Geocoding fallback failed — place.lat/lng will be null',
          { id }
        )
      }
    }
  }

  // ── 7. Create Place ────────────────────────────────────────────────────
  const placePayload = {
    name_i18n,
    description_i18n: Object.keys(description_i18n).length > 0 ? description_i18n : null,
    city_id,
    lat,
    lng,
    images: (suggestion.images as string[]) ?? [],
    status: 'active',
    metadata: {
      // Identification
      google_place_id: meta.google_place_id ?? null,
      // Contact & info (editable by user in wizard, then stored in suggestion.metadata)
      phone: meta.phone ?? null,
      website: meta.website ?? null,
      google_url: meta.google_url ?? null,
      wheelchair: meta.wheelchair ?? null,
      opening_hours_text: meta.opening_hours_text?.length ? meta.opening_hours_text : null,
      // Media
      place_photo_url: meta.place_photo_url ?? null,
      photos: meta.photos?.length ? meta.photos : null,
      // Traceability
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

  // ── 8. Create Activity ─────────────────────────────────────────────────
  const hoursUnknown = meta.hours_unknown === true

  // price column exists on activities; null when free
  const activityPrice: number | null = suggestion.is_free
    ? null
    : typeof meta.price === 'number'
      ? meta.price
      : null

  const activityPayload = {
    place_id: place.id,
    category_id: suggestion.category_id ?? null,
    // Activity title (wizard-authored, DeepL-enriched above)
    title_i18n,
    description_i18n: Object.keys(description_i18n).length > 0 ? description_i18n : null,
    is_free: suggestion.is_free ?? true,
    price: activityPrice,
    stroller_friendly: suggestion.stroller_friendly ?? false,
    open_weekends: suggestion.open_weekends ?? false,
    // Empty string when hours_unknown; structured schedule is in metadata
    schedule: hoursUnknown ? null : ((suggestion.schedule as string) ?? null),
    images: (suggestion.images as string[]) ?? [],
    status: 'approved',
    metadata: {
      from_suggestion: id,
      // Schedule
      hours_unknown: hoursUnknown,
      schedule_structured: hoursUnknown ? null : (meta.schedule_structured ?? null),
      // Age ranges (also in pivot table activity_age_ranges)
      age_range_ids: ageRange.ids ?? [],
      // has_shadow / has_bathrooms have no dedicated column — store in metadata
      has_shadow: meta.has_shadow ?? false,
      has_bathrooms: meta.has_bathrooms ?? false,
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

  // ── 9. Age range pivot rows ────────────────────────────────────────────
  const ageRangeIds = ageRange.ids ?? []
  if (ageRangeIds.length > 0) {
    await supabase
      .from('activity_age_ranges')
      .insert(
        ageRangeIds.map((age_range_id: number) => ({ activity_id: activity.id, age_range_id }))
      )
  }

  // ── 10. Season pivot rows ──────────────────────────────────────────────
  // best_season stores VALUES (e.g. 'spring', 'summer'). 'all' may not have a row —
  // the query simply won't return it, so the insert is safely skipped.
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

  // ── 11. Mark suggestion as approved ───────────────────────────────────
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

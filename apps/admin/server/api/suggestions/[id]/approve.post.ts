import { serverSupabaseServiceRole } from '#supabase/server'
import { getDeeplApiKey, getGooglePlacesApiKey } from '../../../utils/admin-runtime-config'
import { translateI18nField } from '../../../utils/translate'
import type { FieldI18nStatus } from '../../../utils/translate'
import type { Json } from '~/types/database.types'
import { syncActivityPivots } from '../../../utils/activity-pivots'
import { buildActivityInsertFromSuggestion } from '../../../utils/suggestion-approval'
import { resolveSuggestionImages } from '../../../utils/resolve-suggestion-images'

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

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const supabase = serverSupabaseServiceRole(event)
  const deeplApiKey = getDeeplApiKey(event)
  const googlePlacesApiKey = getGooglePlacesApiKey(event)

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

  // ── Branch: experience for an already-existing place ────────────────────
  // No place is created or modified here at all — this is exactly the case
  // the Place/Experience redesign exists to support: a suggestion that only
  // proposes a new activity for a place already in the catalog.
  if (suggestion.suggestion_type === 'experience_for_existing_place') {
    if (!suggestion.place_id) {
      await logError(
        event,
        'suggestions/approve',
        'experience_for_existing_place with no place_id',
        {
          id,
        }
      )
      throw createError({ statusCode: 500, message: 'Sugerencia inconsistente: falta place_id' })
    }

    const { data: place, error: placeError } = await supabase
      .from('places')
      .select('*')
      .eq('id', suggestion.place_id)
      .single()

    if (placeError || !place) {
      await logError(event, 'suggestions/approve', 'Linked place not found', {
        id,
        place_id: suggestion.place_id,
      })
      throw createError({ statusCode: 404, message: 'El lugar asociado ya no existe' })
    }

    await logInfo(
      event,
      'suggestions/approve',
      'Approving experience-for-existing-place suggestion',
      {
        id,
        place_id: place.id,
      }
    )

    // Promote suggestion.metadata.photos into permanent Storage images
    // before it depends on an admin having opened edit mode first (§K —
    // the approve-time image-source bug).
    const resolvedImages = await resolveSuggestionImages(supabase, suggestion, googlePlacesApiKey)

    const { ageRangeIds, bestSeasons, payload } = await buildActivityInsertFromSuggestion(
      suggestion,
      place.id,
      deeplApiKey,
      { imagesOverride: resolvedImages }
    )

    // Re-check for duplicates right before inserting — the flag on this
    // suggestion was computed at submission time and may be stale (another
    // activity could have been added to this place since). Non-blocking:
    // still creates the activity, just persists an updated flag below so the
    // admin can notice/merge it later from the Suggestions table filter.
    let freshDuplicateActivityId: string | null = null
    if (!suggestion.flagged_possible_duplicate) {
      const titleText = Object.values(payload.title_i18n).find((v) => v?.trim()) ?? ''
      const freshDuplicates = titleText
        ? await findExperienceDuplicates(supabase, {
            placeId: place.id,
            title: titleText,
            categoryId: payload.category_id,
          })
        : []
      const firstFreshDuplicate = freshDuplicates[0]
      if (firstFreshDuplicate) {
        freshDuplicateActivityId = firstFreshDuplicate.id
        await logWarn(
          event,
          'suggestions/approve',
          'Fresh duplicate activity detected at approval time',
          {
            id,
            matches: freshDuplicates.map((m) => m.id),
          }
        )
      }
    }

    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert(payload)
      .select()
      .single()

    if (activityError || !activity) {
      await logError(event, 'suggestions/approve', 'Failed to create activity for existing place', {
        id,
        place_id: place.id,
        error: activityError?.message,
      })
      throw createError({
        statusCode: 500,
        message: `Error creando actividad: ${activityError?.message}`,
      })
    }

    await syncActivityPivots(supabase, activity.id, ageRangeIds, bestSeasons)

    await supabase
      .from('suggestions')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        ...(freshDuplicateActivityId
          ? {
              flagged_possible_duplicate: true,
              possible_duplicate_activity_id: freshDuplicateActivityId,
            }
          : {}),
      })
      .eq('id', id)

    await logInfo(
      event,
      'suggestions/approve',
      'Suggestion approved successfully (existing place)',
      {
        id,
        place_id: place.id,
        activity_id: activity.id,
      }
    )

    return { place, activity }
  }

  // ── Branch: new place + experience ───────────────────────────────────────
  await logInfo(event, 'suggestions/approve', 'Approving suggestion', {
    id,
    name: suggestion.name_i18n,
  })

  const meta = (suggestion.metadata as SuggestionMeta | null) ?? {}

  // ── 2. Enrich place name ───────────────────────────────────────────────
  const rawName = (suggestion.name_i18n as Record<string, string>) ?? {}
  let name_i18n = rawName
  let nameStatus: FieldI18nStatus | undefined
  if (deeplApiKey) {
    const translated = await translateI18nField({ existing: rawName, apiKey: deeplApiKey })
    name_i18n = translated.value
    nameStatus = translated.status
  }

  // ── 3. Enrich place description ────────────────────────────────────────
  const rawDesc = (suggestion.description_i18n as Record<string, string>) ?? {}
  let description_i18n = rawDesc
  let descriptionStatus: FieldI18nStatus | undefined
  if (deeplApiKey && Object.keys(rawDesc).length > 0) {
    const translated = await translateI18nField({ existing: rawDesc, apiKey: deeplApiKey })
    description_i18n = translated.value
    descriptionStatus = translated.status
  }

  // ── 4. Resolve city_id — upsert if not found ──────────────────────────
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

  // ── 5. Resolve coordinates (geocoding fallback for manual entries) ──────
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

  // ── 6. Create Place ────────────────────────────────────────────────────
  const nameText = Object.values(name_i18n)[0] ?? ''

  // Promote suggestion.metadata.photos into permanent Storage images (§K) —
  // computed once here and reused for the Activity below, so a suggestion's
  // photos aren't downloaded/re-uploaded twice.
  const resolvedImages = await resolveSuggestionImages(supabase, suggestion, googlePlacesApiKey)

  // Re-check for duplicates right before inserting — same staleness-window
  // reasoning as the experience_for_existing_place branch above.
  let freshDuplicatePlaceId: string | null = null
  if (!suggestion.flagged_possible_duplicate && nameText) {
    const freshDuplicates = await findPlaceDuplicates(supabase, {
      name: nameText,
      lat,
      lng,
      googlePlaceId: meta.google_place_id ?? null,
      cityId: city_id,
    })
    const firstFreshDuplicate = freshDuplicates[0]
    if (firstFreshDuplicate) {
      freshDuplicatePlaceId = firstFreshDuplicate.id
      await logWarn(
        event,
        'suggestions/approve',
        'Fresh duplicate place detected at approval time',
        {
          id,
          matches: freshDuplicates.map((m) => m.id),
        }
      )
    }
  }

  const placePayload = {
    name_i18n,
    description_i18n,
    city_id,
    lat,
    lng,
    images: resolvedImages,
    status: 'active',
    google_place_id: meta.google_place_id ?? null,
    name_normalized: normalizeName(nameText),
    i18n_status: {
      ...(nameStatus ? { name: nameStatus } : {}),
      ...(descriptionStatus ? { description: descriptionStatus } : {}),
    } as Json,
    metadata: {
      // Identification
      google_place_id: meta.google_place_id ?? null,
      // Contact & info (editable by user in wizard, then stored in suggestion.metadata)
      phone: meta.phone ?? null,
      website: sanitizeHttpUrl(meta.website),
      google_url: meta.google_url ?? null,
      wheelchair: meta.wheelchair ?? null,
      opening_hours_text: meta.opening_hours_text?.length ? meta.opening_hours_text : null,
      // Media
      place_photo_url: meta.place_photo_url ?? null,
      photos: meta.photos?.length ? meta.photos : null,
      // Place-level attributes — additive copy alongside the same fields on the
      // Activity below. The public site still filters/displays via Activity;
      // this just gives the place its own record of shared physical attributes
      // (e.g. "does this park have shade") for future activities added under it.
      stroller_friendly: suggestion.stroller_friendly ?? false,
      open_weekends: suggestion.open_weekends ?? false,
      has_shadow: meta.has_shadow ?? false,
      has_bathrooms: meta.has_bathrooms ?? false,
      hours_unknown: meta.hours_unknown === true,
      schedule_structured: meta.hours_unknown === true ? null : (meta.schedule_structured ?? null),
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

  // ── 7. Create Activity ─────────────────────────────────────────────────
  // Reuses the place's enriched description for the activity too — there is
  // no separate activity-level description field collected by the wizard
  // for a brand-new place, so this preserves current behavior exactly.
  const {
    ageRangeIds,
    bestSeasons,
    payload: activityPayload,
  } = await buildActivityInsertFromSuggestion(suggestion, place.id, deeplApiKey, {
    descriptionI18nOverride: description_i18n,
    descriptionI18nStatusOverride: descriptionStatus,
    imagesOverride: resolvedImages,
  })

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

  // ── 8. Pivot rows (age ranges + seasons) ───────────────────────────────
  await syncActivityPivots(supabase, activity.id, ageRangeIds, bestSeasons)

  // ── 9. Mark suggestion as approved ───────────────────────────────────
  await supabase
    .from('suggestions')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      ...(freshDuplicatePlaceId
        ? { flagged_possible_duplicate: true, possible_duplicate_of: freshDuplicatePlaceId }
        : {}),
    })
    .eq('id', id)

  await logInfo(event, 'suggestions/approve', 'Suggestion approved successfully', {
    id,
    place_id: place.id,
    activity_id: activity.id,
  })

  return { place, activity }
})

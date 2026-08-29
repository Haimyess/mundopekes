// POST /api/suggestions/:id/merge  body: { target_place_id: string }
//
// Covers both admin actions from the Place/Experience redesign:
//   - "Merge" a new_place_with_experience suggestion that turned out to be a
//     duplicate of an existing place — discards the proposed place fields
//     entirely, attaches the experience to target_place_id instead.
//   - "Associate" an experience_for_existing_place suggestion with a
//     DIFFERENT place than the one the user originally matched (the
//     automatic/user match was wrong) — same operation, different origin.
// Either way: never creates a new `places` row.
import { serverSupabaseServiceRole } from '#supabase/server'
import { getDeeplApiKey, getGooglePlacesApiKey } from '../../../utils/admin-runtime-config'
import { syncActivityPivots } from '../../../utils/activity-pivots'
import { buildActivityInsertFromSuggestion } from '../../../utils/suggestion-approval'
import { resolveSuggestionImages } from '../../../utils/resolve-suggestion-images'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const body = await readBody<{ target_place_id?: string }>(event)
  const targetPlaceId = body?.target_place_id
  if (!targetPlaceId) {
    throw createError({ statusCode: 400, message: 'target_place_id requerido' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const deeplApiKey = getDeeplApiKey(event)
  const googlePlacesApiKey = getGooglePlacesApiKey(event)

  const { data: suggestion, error: fetchError } = await supabase
    .from('suggestions')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !suggestion) {
    await logError(event, 'suggestions/merge', 'Suggestion not found', { id })
    throw createError({ statusCode: 404, message: 'Sugerencia no encontrada' })
  }

  if (suggestion.status !== 'pending') {
    throw createError({ statusCode: 400, message: `La sugerencia ya fue ${suggestion.status}` })
  }

  const { data: place, error: placeError } = await supabase
    .from('places')
    .select('*')
    .eq('id', targetPlaceId)
    .single()

  if (placeError || !place) {
    await logError(event, 'suggestions/merge', 'Target place not found', {
      id,
      target_place_id: targetPlaceId,
    })
    throw createError({ statusCode: 404, message: 'El lugar de destino no existe' })
  }

  await logInfo(event, 'suggestions/merge', 'Merging suggestion into existing place', {
    id,
    original_type: suggestion.suggestion_type,
    target_place_id: place.id,
  })

  // Promote suggestion.metadata.photos into permanent Storage images (§K —
  // the approve-time image-source bug also applied here).
  const resolvedImages = await resolveSuggestionImages(supabase, suggestion, googlePlacesApiKey)

  const { ageRangeIds, bestSeasons, payload } = await buildActivityInsertFromSuggestion(
    suggestion,
    place.id,
    deeplApiKey,
    { imagesOverride: resolvedImages }
  )

  // The admin picked target_place_id deliberately — this IS the duplicate-
  // resolution action, so re-checking for a duplicate PLACE would be noise.
  // What's still worth catching: the target place might already have an
  // activity essentially identical to the one about to be attached here
  // (e.g. it already absorbed a similar suggestion earlier).
  let duplicateActivityId: string | null = null
  const titleText = Object.values(payload.title_i18n).find((v) => v?.trim()) ?? ''
  const duplicates = titleText
    ? await findExperienceDuplicates(supabase, {
        placeId: place.id,
        title: titleText,
        categoryId: payload.category_id,
      })
    : []
  const firstDuplicate = duplicates[0]
  if (firstDuplicate) {
    duplicateActivityId = firstDuplicate.id
    await logWarn(event, 'suggestions/merge', 'Target place already has a similar activity', {
      id,
      target_place_id: place.id,
      matches: duplicates.map((m) => m.id),
    })
  }

  const { data: activity, error: activityError } = await supabase
    .from('activities')
    .insert(payload)
    .select()
    .single()

  if (activityError || !activity) {
    await logError(event, 'suggestions/merge', 'Failed to create activity on merge', {
      id,
      target_place_id: place.id,
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
      place_id: place.id,
      suggestion_type: 'experience_for_existing_place',
      reviewed_at: new Date().toISOString(),
      ...(duplicateActivityId
        ? { flagged_possible_duplicate: true, possible_duplicate_activity_id: duplicateActivityId }
        : {}),
    })
    .eq('id', id)

  await logInfo(event, 'suggestions/merge', 'Suggestion merged successfully', {
    id,
    place_id: place.id,
    activity_id: activity.id,
  })

  return { place, activity }
})

import { serverSupabaseServiceRole } from '#supabase/server'
import { getDeeplApiKey, getGooglePlacesApiKey } from '../../../utils/admin-runtime-config'
import type { FieldI18nStatus } from '../../../utils/translate'
import { syncActivityPivots } from '../../../utils/activity-pivots'
import {
  buildActivityInsertFromSuggestion,
  createPlaceFromSuggestion,
} from '../../../utils/suggestion-approval'
import { resolveSuggestionImages } from '../../../utils/resolve-suggestion-images'

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

  // ── Claim this suggestion (and any group siblings) before doing anything
  // else — a conditional update that only succeeds if nothing else has
  // touched `reviewed_at` yet. Guards against a double-click or two admins
  // approving/merging the same (grouped) suggestion concurrently: whichever
  // request's claim affects zero rows backs off instead of creating a
  // second place/activity.
  const groupId = suggestion.suggestion_group_id
  let claim = supabase
    .from('suggestions')
    .update({ reviewed_at: new Date().toISOString() })
    .eq('status', 'pending')
    .is('reviewed_at', null)
  claim = groupId ? claim.eq('suggestion_group_id', groupId) : claim.eq('id', id)
  const { data: claimed, error: claimError } = await claim.select('id')

  if (claimError) {
    await logError(event, 'suggestions/approve', 'Failed to claim suggestion(s)', {
      id,
      error: claimError.message,
    })
    throw createError({ statusCode: 500, message: 'Error al reservar la sugerencia' })
  }
  if (!claimed || claimed.length === 0) {
    await logWarn(event, 'suggestions/approve', 'Suggestion already claimed by another request', {
      id,
    })
    throw createError({
      statusCode: 409,
      message: 'La sugerencia ya está siendo procesada en otra solicitud',
    })
  }

  // ── Branch: a group of one-or-more experiences for a brand-new place ────
  // (see supabase/migrations/20260829090000_suggestion_groups.sql). All
  // siblings share `suggestion_group_id`; exactly one is `is_primary` and
  // carries the place's fields. The place is created once here, then one
  // activity per sibling.
  if (groupId && suggestion.suggestion_type === 'new_place_with_experience') {
    const { data: siblings, error: siblingsError } = await supabase
      .from('suggestions')
      .select('*')
      .eq('suggestion_group_id', groupId)

    if (siblingsError || !siblings || siblings.length === 0) {
      await logError(event, 'suggestions/approve', 'Failed to load suggestion group', {
        id,
        groupId,
        error: siblingsError?.message,
      })
      throw createError({ statusCode: 500, message: 'Error cargando el grupo de sugerencias' })
    }

    const primary = siblings.find((s) => s.is_primary) ?? suggestion
    const resolvedImages = await resolveSuggestionImages(supabase, primary, googlePlacesApiKey)

    const {
      place,
      error: placeErr,
      freshDuplicatePlaceId,
    } = await createPlaceFromSuggestion(supabase, primary, deeplApiKey, resolvedImages)
    if (placeErr || !place) {
      throw createError({ statusCode: 500, message: `Error creando lugar: ${placeErr}` })
    }

    const built = await Promise.all(
      siblings.map((sib) =>
        buildActivityInsertFromSuggestion(sib, place.id, deeplApiKey, {
          descriptionI18nOverride: sib.is_primary ? place.description_i18n : undefined,
          imagesOverride: resolvedImages,
        })
      )
    )

    const { data: createdActivities, error: activitiesError } = await supabase
      .from('activities')
      .insert(built.map((b) => b.payload))
      .select()

    if (activitiesError || !createdActivities) {
      await supabase.from('places').delete().eq('id', place.id)
      await logError(event, 'suggestions/approve', 'Failed to create grouped activities', {
        id,
        groupId,
        place_id: place.id,
        error: activitiesError?.message,
      })
      throw createError({
        statusCode: 500,
        message: `Error creando actividades: ${activitiesError?.message}`,
      })
    }

    for (const activity of createdActivities) {
      const meta = activity.metadata as { from_suggestion?: string } | null
      const match = built.find((b) => b.payload.metadata.from_suggestion === meta?.from_suggestion)
      if (match)
        await syncActivityPivots(supabase, activity.id, match.ageRangeIds, match.bestSeasons)
    }

    await supabase
      .from('suggestions')
      .update({
        status: 'approved',
        place_id: place.id,
        ...(freshDuplicatePlaceId
          ? { flagged_possible_duplicate: true, possible_duplicate_of: freshDuplicatePlaceId }
          : {}),
      })
      .eq('suggestion_group_id', groupId)

    await logInfo(event, 'suggestions/approve', 'Suggestion group approved successfully', {
      groupId,
      place_id: place.id,
      activity_ids: createdActivities.map((a) => a.id),
    })

    return { place, activities: createdActivities }
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

  // Promote suggestion.metadata.photos into permanent Storage images (§K) —
  // computed once here and reused for the Activity below, so a suggestion's
  // photos aren't downloaded/re-uploaded twice.
  const resolvedImages = await resolveSuggestionImages(supabase, suggestion, googlePlacesApiKey)

  const {
    place,
    error: placeError,
    freshDuplicatePlaceId,
  } = await createPlaceFromSuggestion(supabase, suggestion, deeplApiKey, resolvedImages)

  if (placeError || !place) {
    await logError(event, 'suggestions/approve', 'Failed to create place', {
      id,
      error: placeError,
    })
    throw createError({ statusCode: 500, message: `Error creando lugar: ${placeError}` })
  }

  if (freshDuplicatePlaceId) {
    await logWarn(event, 'suggestions/approve', 'Fresh duplicate place detected at approval time', {
      id,
      match: freshDuplicatePlaceId,
    })
  }

  // ── 7. Create Activity ─────────────────────────────────────────────────
  // Reuses the place's enriched description for the activity too — there is
  // no separate activity-level description field collected by the wizard
  // for a brand-new place, so this preserves current behavior exactly.
  const placeI18nStatus = place.i18n_status as { description?: FieldI18nStatus } | null
  const {
    ageRangeIds,
    bestSeasons,
    payload: activityPayload,
  } = await buildActivityInsertFromSuggestion(suggestion, place.id, deeplApiKey, {
    descriptionI18nOverride: (place.description_i18n as Record<string, string> | null) ?? {},
    descriptionI18nStatusOverride: placeI18nStatus?.description,
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

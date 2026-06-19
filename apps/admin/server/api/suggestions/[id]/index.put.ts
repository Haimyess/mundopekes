import { serverSupabaseClient } from '#supabase/server'
import type { Database, TablesUpdate } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const body = await readBody(event)
  const supabase = await serverSupabaseClient<Database>(event)

  // Fetch existing row when needed for metadata merge or coord preservation
  let existing: { metadata?: unknown; location?: unknown } | null = null
  if (body.metadata !== undefined || body.location !== undefined) {
    const { data } = await supabase
      .from('suggestions')
      .select('metadata, location')
      .eq('id', id)
      .single()
    existing = data
  }

  const update: TablesUpdate<'suggestions'> = {}
  const u = update as Record<string, unknown>

  if (body.status !== undefined) update.status = body.status
  if (body.rejection_reason !== undefined) update.rejection_reason = body.rejection_reason
  if (body.name_i18n !== undefined) u.name_i18n = body.name_i18n
  if (body.description_i18n !== undefined) u.description_i18n = body.description_i18n
  if (body.category_id !== undefined) u.category_id = body.category_id
  if (body.age_range !== undefined) update.age_range = body.age_range
  if (body.type !== undefined) update.type = body.type
  if (body.best_season !== undefined) update.best_season = body.best_season
  if (body.stroller_friendly !== undefined) update.stroller_friendly = body.stroller_friendly
  if (body.open_weekends !== undefined) update.open_weekends = body.open_weekends
  if (body.is_free !== undefined) update.is_free = body.is_free
  if (body.schedule !== undefined) update.schedule = body.schedule

  // Location: geocode if address provided but coords are missing.
  // Defensive: on failure, preserve previous coords; never block the save.
  if (body.location !== undefined) {
    const loc = { ...(body.location as Record<string, unknown>) }
    const hasCoords = loc.lat != null && loc.lng != null
    if (!hasCoords && (loc.address || loc.city)) {
      const geoQuery = [loc.address, loc.city].filter(Boolean).join(', ')
      const coords = await geocodeAddress(geoQuery as string)
      if (coords) {
        loc.lat = coords.lat
        loc.lng = coords.lng
        await logInfo(event, 'suggestions/update', 'Geocoded location on edit', {
          id,
          lat: coords.lat,
          lng: coords.lng,
        })
      } else {
        // Fall back to coords stored in existing row
        const prevLoc = (existing?.location as Record<string, unknown>) ?? {}
        loc.lat = prevLoc.lat ?? null
        loc.lng = prevLoc.lng ?? null
        await logWarn(
          event,
          'suggestions/update',
          'Geocoding failed on edit — preserving previous coords',
          { id }
        )
      }
    }
    update.location = loc
  }

  // Metadata: MERGE with existing — never overwrite the whole object.
  // This preserves Google place data, photos, etc. while updating only the edited keys.
  if (body.metadata !== undefined) {
    const existingMeta = (existing?.metadata as Record<string, unknown>) ?? {}
    const incomingMeta = body.metadata as Record<string, unknown>
    u.metadata = { ...existingMeta, ...incomingMeta }
  }

  const { data, error } = await supabase
    .from('suggestions')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})

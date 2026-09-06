import { serverSupabaseClient } from '#supabase/server'
import type { Database, TablesUpdate } from '~/types/database.types'
import { getDeeplApiKey } from '../../../utils/admin-runtime-config'
import { translateI18nField } from '../../../utils/translate'
import type { FieldI18nStatus } from '../../../utils/translate'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const body = await readBody(event)
  const supabase = await serverSupabaseClient<Database>(event)
  const deeplApiKey = getDeeplApiKey(event)

  // Fetch existing row when needed for metadata merge, coord preservation, or
  // diffing i18n fields against their previous value (see translateI18nField below)
  let existing: {
    metadata?: unknown
    location?: unknown
    name_i18n?: unknown
    description_i18n?: unknown
    i18n_status?: unknown
  } | null = null
  if (
    body.metadata !== undefined ||
    body.location !== undefined ||
    body.name_i18n !== undefined ||
    body.description_i18n !== undefined
  ) {
    const { data } = await supabase
      .from('suggestions')
      .select('metadata, location, name_i18n, description_i18n, i18n_status')
      .eq('id', id)
      .single()
    existing = data
  }

  const priorStatus = (existing?.i18n_status as Record<string, FieldI18nStatus>) ?? {}
  const i18nStatus: Record<string, FieldI18nStatus> = { ...priorStatus }
  let i18nStatusChanged = false

  // Retranslate the other locales whenever an admin edits one language and saves —
  // same behavior as places/[id].put.ts and activities/[id].put.ts, which this
  // endpoint was missing (edits to a pending suggestion never propagated across
  // locales until approval).
  //
  // Si el body ya trae el status calculado por I18nTabs (traducción en vivo en
  // blur, antes de este guardado), confiamos en él tal cual en vez de volver a
  // diffear contra la DB — ver el comentario más largo en activities/[id].put.ts
  // (mismo problema, mismo fix).
  if (body.name_i18n && typeof body.name_i18n === 'object') {
    if (body.name_i18n_status) {
      i18nStatus.name = body.name_i18n_status as FieldI18nStatus
      i18nStatusChanged = true
    } else if (deeplApiKey) {
      const { value, status } = await translateI18nField({
        existing: body.name_i18n,
        apiKey: deeplApiKey,
        previous: (existing?.name_i18n as Record<string, string>) ?? undefined,
        priorStatus: priorStatus.name,
      })
      body.name_i18n = value
      if (status) {
        i18nStatus.name = status
        i18nStatusChanged = true
      }
    }
  }
  if (body.description_i18n && typeof body.description_i18n === 'object') {
    if (body.description_i18n_status) {
      i18nStatus.description = body.description_i18n_status as FieldI18nStatus
      i18nStatusChanged = true
    } else if (deeplApiKey) {
      const { value, status } = await translateI18nField({
        existing: body.description_i18n,
        apiKey: deeplApiKey,
        previous: (existing?.description_i18n as Record<string, string>) ?? undefined,
        priorStatus: priorStatus.description,
      })
      body.description_i18n = value
      if (status) {
        i18nStatus.description = status
        i18nStatusChanged = true
      }
    }
  }
  // Activity title lives nested inside metadata.title_i18n (set by the wizard) —
  // enrich it the same way before it gets merged into u.metadata below.
  const incomingTitle = (body.metadata as Record<string, unknown> | undefined)?.title_i18n
  if (incomingTitle && typeof incomingTitle === 'object') {
    if (body.title_i18n_status) {
      i18nStatus.title = body.title_i18n_status as FieldI18nStatus
      i18nStatusChanged = true
    } else if (deeplApiKey) {
      const existingTitle = (existing?.metadata as Record<string, unknown> | undefined)
        ?.title_i18n as Record<string, string> | undefined
      const { value, status } = await translateI18nField({
        existing: incomingTitle as Record<string, string>,
        apiKey: deeplApiKey,
        previous: existingTitle,
        priorStatus: priorStatus.title,
      })
      ;(body.metadata as Record<string, unknown>).title_i18n = value
      if (status) {
        i18nStatus.title = status
        i18nStatusChanged = true
      }
    }
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
  if (body.images !== undefined) update.images = body.images
  if (i18nStatusChanged) u.i18n_status = i18nStatus

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

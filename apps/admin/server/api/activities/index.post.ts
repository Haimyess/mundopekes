import { serverSupabaseClient } from '#supabase/server'
import { translateI18nField } from '../../utils/translate'
import type { FieldI18nStatus } from '../../utils/translate'
import { syncActivityPivots } from '../../utils/activity-pivots'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = await serverSupabaseClient(event)
  const config = useRuntimeConfig(event)

  const i18nStatus: Record<string, FieldI18nStatus> = {}

  // Si el body ya trae el status calculado por I18nTabs (traducción en vivo
  // en blur, antes de este guardado), confiamos en él tal cual — ver el
  // comentario más largo en activities/[id].put.ts.
  if (body.title_i18n_status) {
    i18nStatus.title = body.title_i18n_status as FieldI18nStatus
  } else if (config.deeplApiKey && body.title_i18n && typeof body.title_i18n === 'object') {
    const { value, status } = await translateI18nField({
      existing: body.title_i18n,
      apiKey: config.deeplApiKey,
    })
    body.title_i18n = value
    if (status) i18nStatus.title = status
  }
  if (body.description_i18n_status) {
    i18nStatus.description = body.description_i18n_status as FieldI18nStatus
  } else if (
    config.deeplApiKey &&
    body.description_i18n &&
    typeof body.description_i18n === 'object'
  ) {
    const { value, status } = await translateI18nField({
      existing: body.description_i18n,
      apiKey: config.deeplApiKey,
    })
    body.description_i18n = value
    if (status) i18nStatus.description = status
  }
  delete body.title_i18n_status
  delete body.description_i18n_status

  // Duplicate check — non-blocking, same pattern as places/index.post.ts and
  // the public suggestion flow (findExperienceDuplicates: cross-layer
  // auto-import). Run before insert so it can't match against itself.
  const titleText = Object.values((body.title_i18n as Record<string, string>) ?? {}).find((v) =>
    v?.trim()
  )
  const duplicates =
    titleText && body.place_id
      ? await findExperienceDuplicates(supabase, {
          placeId: body.place_id,
          title: titleText,
          categoryId: body.category_id ?? null,
        })
      : []

  // Pivots no son columnas de `activities` — se escriben aparte en las tablas pivote
  const { age_range_ids, best_season, ...activityRow } = body

  const { data, error } = await supabase
    .from('activities')
    .insert({ ...activityRow, i18n_status: i18nStatus })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  await syncActivityPivots(supabase, data.id, age_range_ids, best_season)

  return { ...data, duplicates }
})

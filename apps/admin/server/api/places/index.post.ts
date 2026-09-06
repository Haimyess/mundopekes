import { serverSupabaseClient } from '#supabase/server'
import { translateI18nField } from '../../utils/translate'
import type { FieldI18nStatus } from '../../utils/translate'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const supabase = await serverSupabaseClient(event)
  const config = useRuntimeConfig(event)

  const i18nStatus: Record<string, FieldI18nStatus> = {}

  // Si el body ya trae el status calculado por I18nTabs (traducción en vivo
  // en blur, antes de este guardado), confiamos en él tal cual — ver el
  // comentario más largo en places/[id].put.ts.
  if (body.name_i18n_status) {
    i18nStatus.name = body.name_i18n_status as FieldI18nStatus
  } else if (config.deeplApiKey && body.name_i18n && typeof body.name_i18n === 'object') {
    const { value, status } = await translateI18nField({
      existing: body.name_i18n,
      apiKey: config.deeplApiKey,
    })
    body.name_i18n = value
    if (status) i18nStatus.name = status
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
  delete body.name_i18n_status
  delete body.description_i18n_status

  // Duplicate check — non-blocking, same pattern as the public suggestion
  // flow (findPlaceDuplicates comes from layers/domain/server/utils/
  // duplicate-detection.ts via Nitro's cross-layer auto-import). Admin-
  // created places never had this protection before; run it BEFORE the
  // insert so it can't match against the row about to be created, and only
  // surface the result to the client as a warning — it never blocks the create.
  const nameText = Object.values((body.name_i18n as Record<string, string>) ?? {}).find((v) =>
    v?.trim()
  )
  const duplicates = nameText
    ? await findPlaceDuplicates(supabase, {
        name: nameText,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        googlePlaceId:
          ((body.metadata as Record<string, unknown> | undefined)?.google_place_id as
            string | undefined) ?? null,
        cityId: body.city_id ?? null,
      })
    : []

  const { data, error } = await supabase
    .from('places')
    .insert({ status: 'active', ...body, i18n_status: i18nStatus })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { ...data, duplicates }
})

import { serverSupabaseClient } from '#supabase/server'
import { enrichI18nField } from '../../utils/translate'
import { syncActivityPivots } from '../../utils/activity-pivots'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const body = await readBody(event)
  const config = useRuntimeConfig(event)
  const client = await serverSupabaseClient(event)

  if (config.deeplApiKey && (body.title_i18n || body.description_i18n)) {
    const { data: existing } = await client
      .from('activities')
      .select('title_i18n, description_i18n')
      .eq('id', id)
      .single()

    if (body.title_i18n && typeof body.title_i18n === 'object') {
      body.title_i18n = await enrichI18nField(
        body.title_i18n,
        config.deeplApiKey,
        (existing?.title_i18n as Record<string, string>) ?? undefined
      )
    }
    if (body.description_i18n && typeof body.description_i18n === 'object') {
      body.description_i18n = await enrichI18nField(
        body.description_i18n,
        config.deeplApiKey,
        (existing?.description_i18n as Record<string, string>) ?? undefined
      )
    }
  }

  // Pivots no son columnas de `activities` — se escriben aparte en las tablas pivote
  const { age_range_ids, best_season, ...activityRow } = body

  const { data, error } = await client
    .from('activities')
    .update(activityRow)
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  await syncActivityPivots(client, id, age_range_ids, best_season)

  return data
})

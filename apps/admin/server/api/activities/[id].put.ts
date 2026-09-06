import { serverSupabaseClient } from '#supabase/server'
import { translateI18nField } from '../../utils/translate'
import type { FieldI18nStatus } from '../../utils/translate'
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
      .select('title_i18n, description_i18n, i18n_status')
      .eq('id', id)
      .single()

    const priorStatus = (existing?.i18n_status as Record<string, FieldI18nStatus>) ?? {}
    const i18nStatus: Record<string, FieldI18nStatus> = { ...priorStatus }

    // Si el body ya trae el status calculado por I18nTabs (traducción en vivo
    // en blur, antes de este guardado), confiamos en él tal cual en vez de
    // volver a diffear contra la DB — a esta altura `body.title_i18n` ya
    // difiere de `existing.title_i18n` en TODOS los locales que el blur tocó,
    // no sólo en el que el admin tipeó, así que translateI18nField ya no
    // puede distinguir "fuente editada a mano" de "ya traducido por el blur".
    if (body.title_i18n && typeof body.title_i18n === 'object') {
      if (body.title_i18n_status) {
        i18nStatus.title = body.title_i18n_status as FieldI18nStatus
      } else {
        const { value, status } = await translateI18nField({
          existing: body.title_i18n,
          apiKey: config.deeplApiKey,
          previous: (existing?.title_i18n as Record<string, string>) ?? undefined,
          priorStatus: priorStatus.title,
        })
        body.title_i18n = value
        if (status) i18nStatus.title = status
      }
    }
    if (body.description_i18n && typeof body.description_i18n === 'object') {
      if (body.description_i18n_status) {
        i18nStatus.description = body.description_i18n_status as FieldI18nStatus
      } else {
        const { value, status } = await translateI18nField({
          existing: body.description_i18n,
          apiKey: config.deeplApiKey,
          previous: (existing?.description_i18n as Record<string, string>) ?? undefined,
          priorStatus: priorStatus.description,
        })
        body.description_i18n = value
        if (status) i18nStatus.description = status
      }
    }
    body.i18n_status = i18nStatus
  }
  delete body.title_i18n_status
  delete body.description_i18n_status

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

import { serverSupabaseClient } from '#supabase/server'
import { translateI18nField } from '../../utils/translate'
import type { FieldI18nStatus } from '../../utils/translate'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const body = await readBody(event)
  const config = useRuntimeConfig(event)
  const client = await serverSupabaseClient(event)

  if (config.deeplApiKey && (body.name_i18n || body.description_i18n)) {
    const { data: existing } = await client
      .from('places')
      .select('name_i18n, description_i18n, i18n_status')
      .eq('id', id)
      .single()

    const priorStatus = (existing?.i18n_status as Record<string, FieldI18nStatus>) ?? {}
    const i18nStatus: Record<string, FieldI18nStatus> = { ...priorStatus }

    // Si el body ya trae el status calculado por I18nTabs (traducción en vivo
    // en blur, antes de este guardado), confiamos en él tal cual en vez de
    // volver a diffear contra la DB — ver el comentario más largo en
    // activities/[id].put.ts (mismo problema, mismo fix).
    if (body.name_i18n && typeof body.name_i18n === 'object') {
      if (body.name_i18n_status) {
        i18nStatus.name = body.name_i18n_status as FieldI18nStatus
      } else {
        const { value, status } = await translateI18nField({
          existing: body.name_i18n,
          apiKey: config.deeplApiKey,
          previous: (existing?.name_i18n as Record<string, string>) ?? undefined,
          priorStatus: priorStatus.name,
        })
        body.name_i18n = value
        if (status) i18nStatus.name = status
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
  delete body.name_i18n_status
  delete body.description_i18n_status

  const { data, error } = await client.from('places').update(body).eq('id', id).select().single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})

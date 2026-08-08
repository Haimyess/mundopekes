import { serverSupabaseClient } from '#supabase/server'
import { enrichI18nField } from '../../utils/translate'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const body = await readBody(event)
  const config = useRuntimeConfig(event)
  const client = await serverSupabaseClient(event)

  if (config.deeplApiKey && (body.name_i18n || body.description_i18n)) {
    const { data: existing } = await client
      .from('places')
      .select('name_i18n, description_i18n')
      .eq('id', id)
      .single()

    if (body.name_i18n && typeof body.name_i18n === 'object') {
      body.name_i18n = await enrichI18nField(
        body.name_i18n,
        config.deeplApiKey,
        (existing?.name_i18n as Record<string, string>) ?? undefined
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

  const { data, error } = await client.from('places').update(body).eq('id', id).select().single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})

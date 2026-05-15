import { serverSupabaseClient } from '#supabase/server'
import { enrichI18nField } from '../../utils/translate'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const body = await readBody(event)
  const config = useRuntimeConfig(event)

  if (config.deeplApiKey) {
    if (body.name_i18n && typeof body.name_i18n === 'object') {
      body.name_i18n = await enrichI18nField(body.name_i18n, config.deeplApiKey)
    }
    if (body.description_i18n && typeof body.description_i18n === 'object') {
      body.description_i18n = await enrichI18nField(body.description_i18n, config.deeplApiKey)
    }
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await client.from('places').update(body).eq('id', id).select().single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})

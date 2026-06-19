import { serverSupabaseClient } from '#supabase/server'
import { enrichI18nField } from '../../utils/translate'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const body = await readBody(event)
  const supabase = await serverSupabaseClient(event)
  const config = useRuntimeConfig(event)

  if (config.deeplApiKey) {
    if (body.title_i18n && typeof body.title_i18n === 'object') {
      body.title_i18n = await enrichI18nField(body.title_i18n, config.deeplApiKey)
    }
    if (body.description_i18n && typeof body.description_i18n === 'object') {
      body.description_i18n = await enrichI18nField(body.description_i18n, config.deeplApiKey)
    }
  }

  const { data, error } = await supabase.from('activities').insert(body).select().single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})

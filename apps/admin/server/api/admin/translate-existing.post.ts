import { createClient } from '@supabase/supabase-js'
import { enrichI18nField } from '../../utils/translate'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  const authHeader = getHeader(event, 'x-admin-secret')
  if (authHeader !== config.supabaseServiceKey) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  if (!config.deeplApiKey) {
    throw createError({ statusCode: 500, message: 'DeepL API key not configured' })
  }

  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )

  const results = { activities: 0, places: 0, errors: 0 }

  const { data: activities } = await supabase
    .from('activities')
    .select('id, title_i18n, description_i18n')

  for (const activity of activities ?? []) {
    try {
      const title_i18n = await enrichI18nField(
        (activity.title_i18n as Record<string, string>) ?? {},
        config.deeplApiKey
      )
      const description_i18n = activity.description_i18n
        ? await enrichI18nField(
            activity.description_i18n as Record<string, string>,
            config.deeplApiKey
          )
        : null

      await supabase
        .from('activities')
        .update({ title_i18n, ...(description_i18n ? { description_i18n } : {}) })
        .eq('id', activity.id)

      results.activities++
    } catch {
      results.errors++
    }
  }

  const { data: places } = await supabase.from('places').select('id, name_i18n, description_i18n')

  for (const place of places ?? []) {
    try {
      const name_i18n = await enrichI18nField(
        (place.name_i18n as Record<string, string>) ?? {},
        config.deeplApiKey
      )
      const description_i18n = place.description_i18n
        ? await enrichI18nField(
            place.description_i18n as Record<string, string>,
            config.deeplApiKey
          )
        : null

      await supabase
        .from('places')
        .update({ name_i18n, ...(description_i18n ? { description_i18n } : {}) })
        .eq('id', place.id)

      results.places++
    } catch {
      results.errors++
    }
  }

  return { success: true, results }
})

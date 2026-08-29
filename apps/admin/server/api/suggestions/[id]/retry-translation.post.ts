// POST /api/suggestions/:id/retry-translation
//
// Re-attempts translation only for the locale(s) currently marked `error` in
// i18n_status, for whichever of name/description/title actually have one —
// see §F of the proposal (partial translation state should be retriable
// without re-editing anything). Locales that are fine (manual/auto) are left
// completely untouched via translateI18nField's forceLocales param.
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { getDeeplApiKey } from '../../../utils/admin-runtime-config'
import { translateI18nField } from '../../../utils/translate'
import type { FieldI18nStatus } from '../../../utils/translate'

function errorLocalesFor(fieldStatus: FieldI18nStatus | undefined): string[] {
  if (!fieldStatus) return []
  return Object.entries(fieldStatus)
    .filter(
      ([key, entry]) =>
        key !== 'sourceLocale' && typeof entry === 'object' && entry?.status === 'error'
    )
    .map(([key]) => key)
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const deeplApiKey = getDeeplApiKey(event)
  if (!deeplApiKey) {
    throw createError({ statusCode: 400, message: 'DeepL no está configurado' })
  }

  const supabase = await serverSupabaseClient<Database>(event)
  const { data: existing, error: fetchError } = await supabase
    .from('suggestions')
    .select('name_i18n, description_i18n, metadata, i18n_status')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    throw createError({ statusCode: 404, message: 'Sugerencia no encontrada' })
  }

  const priorStatus = (existing.i18n_status as Record<string, FieldI18nStatus>) ?? {}
  const i18nStatus: Record<string, FieldI18nStatus> = { ...priorStatus }
  const update: Record<string, unknown> = {}
  const retried: string[] = []

  const nameI18n = (existing.name_i18n as Record<string, string>) ?? {}
  const nameErrors = errorLocalesFor(priorStatus.name)
  if (nameErrors.length > 0) {
    const { value, status } = await translateI18nField({
      existing: nameI18n,
      apiKey: deeplApiKey,
      previous: nameI18n,
      priorStatus: priorStatus.name,
      forceLocales: nameErrors,
    })
    update.name_i18n = value
    if (status) i18nStatus.name = status
    retried.push('name')
  }

  const descriptionI18n = (existing.description_i18n as Record<string, string>) ?? {}
  const descriptionErrors = errorLocalesFor(priorStatus.description)
  if (descriptionErrors.length > 0) {
    const { value, status } = await translateI18nField({
      existing: descriptionI18n,
      apiKey: deeplApiKey,
      previous: descriptionI18n,
      priorStatus: priorStatus.description,
      forceLocales: descriptionErrors,
    })
    update.description_i18n = value
    if (status) i18nStatus.description = status
    retried.push('description')
  }

  const meta = (existing.metadata as Record<string, unknown> | null) ?? {}
  const titleI18n = (meta.title_i18n as Record<string, string> | undefined) ?? {}
  const titleErrors = errorLocalesFor(priorStatus.title)
  if (titleErrors.length > 0 && Object.keys(titleI18n).length > 0) {
    const { value, status } = await translateI18nField({
      existing: titleI18n,
      apiKey: deeplApiKey,
      previous: titleI18n,
      priorStatus: priorStatus.title,
      forceLocales: titleErrors,
    })
    update.metadata = { ...meta, title_i18n: value }
    if (status) i18nStatus.title = status
    retried.push('title')
  }

  if (retried.length === 0) {
    return { retried, i18n_status: priorStatus }
  }

  update.i18n_status = i18nStatus

  const { data, error } = await supabase
    .from('suggestions')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { ...data, retried }
})

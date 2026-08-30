// POST /api/i18n/translate-field
//
// Traduce un campo i18n en vivo a partir del input único de UiI18nTabs: el
// admin ya no elige en qué idioma escribe, así que acá se detecta con DeepL
// y se traduce el resto — mismo mecanismo (translateI18nField, protección de
// locales 'manual') que ya corría al guardar cada entidad, pero invocable
// por campo mientras el drawer sigue abierto, para que si algún idioma queda
// sin traducir el form pueda mostrar su input antes de guardar.
import { getDeeplApiKey } from '../../utils/admin-runtime-config'
import { translateSingleFieldInput } from '../../utils/translate'
import type { FieldI18nStatus } from '../../utils/translate'

export default defineEventHandler(async (event) => {
  const { text, locale, previous, priorStatus } = await readBody<{
    text: string
    locale?: string
    previous?: Record<string, string>
    priorStatus?: FieldI18nStatus
  }>(event)

  const deeplApiKey = getDeeplApiKey(event)
  if (!deeplApiKey) {
    throw createError({ statusCode: 400, message: 'DeepL no está configurado' })
  }
  if (!text?.trim()) {
    throw createError({ statusCode: 400, message: 'Texto requerido' })
  }

  return translateSingleFieldInput({ text, apiKey: deeplApiKey, locale, previous, priorStatus })
})

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate'

// Used for target_lang (accepts region variants like EN-US)
const LOCALE_TO_DEEPL: Record<string, string> = {
  es: 'ES',
  he: 'HE',
  en: 'EN-US',
  ru: 'RU',
}

// Used for source_lang (only plain 2-letter codes; EN-US is invalid as source)
const LOCALE_TO_DEEPL_SOURCE: Record<string, string> = {
  es: 'ES',
  he: 'HE',
  en: 'EN',
  ru: 'RU',
}

const TARGET_LOCALES = ['es', 'he', 'en', 'ru'] as const

/**
 * Takes an existing i18n JSONB field and fills in missing languages using DeepL.
 * When `previous` (the value currently stored in the DB) is passed, any locale
 * whose text changed vs. `previous` is treated as the new source of truth and
 * propagated to every other locale — not just the empty ones. This is what makes
 * editing a name in one language retranslate the others instead of leaving them
 * stale. Without `previous` (e.g. creating a new row), only empty locales are filled.
 * Returns the enriched Record<string, string>.
 */
export async function enrichI18nField(
  existing: Record<string, string>,
  apiKey: string,
  previous?: Record<string, string>
): Promise<Record<string, string>> {
  const changedLocales = previous
    ? TARGET_LOCALES.filter(
        (locale) => existing[locale]?.trim() && existing[locale] !== previous[locale]
      )
    : []

  const sourceLocale = changedLocales[0] ?? Object.entries(existing).find(([, v]) => v?.trim())?.[0]
  if (!sourceLocale) return existing

  const sourceText = existing[sourceLocale]
  if (!sourceText?.trim()) return existing

  const result: Record<string, string> = { ...existing }

  // Si se editó manualmente uno o más idiomas, retraducimos el resto a partir del
  // primero que cambió, sin pisar los que también se editaron a mano en el mismo
  // guardado. Si no hay ningún cambio detectado, sólo completamos los vacíos.
  const targetLocales =
    changedLocales.length > 0
      ? TARGET_LOCALES.filter((locale) => !changedLocales.includes(locale))
      : TARGET_LOCALES.filter((locale) => !existing[locale]?.trim())

  if (targetLocales.length === 0) return existing

  await Promise.all(
    targetLocales.map(async (targetLocale) => {
      try {
        const res = await fetch(DEEPL_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `DeepL-Auth-Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: [sourceText],
            target_lang: LOCALE_TO_DEEPL[targetLocale],
            source_lang: LOCALE_TO_DEEPL_SOURCE[sourceLocale],
          }),
        })

        if (!res.ok) {
          console.error(`DeepL error for ${targetLocale}:`, res.status, await res.text())
          return
        }

        const data = (await res.json()) as { translations: { text: string }[] }
        const translated = data.translations?.[0]?.text
        if (translated) result[targetLocale] = translated
      } catch (err) {
        console.error(`DeepL translation failed for ${targetLocale}:`, err)
      }
    })
  )

  return result
}

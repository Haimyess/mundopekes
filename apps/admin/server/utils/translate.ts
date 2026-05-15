const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate'

const LOCALE_TO_DEEPL: Record<string, string> = {
  es: 'ES',
  he: 'HE',
  en: 'EN-US',
  ru: 'RU',
}

const TARGET_LOCALES = ['es', 'he', 'en', 'ru'] as const

/**
 * Takes an existing i18n JSONB field and fills in missing languages using DeepL.
 * Only translates locales that are missing or empty.
 * Returns the enriched Record<string, string>.
 */
export async function enrichI18nField(
  existing: Record<string, string>,
  apiKey: string
): Promise<Record<string, string>> {
  const sourceLocale = Object.entries(existing).find(([, v]) => v?.trim())?.[0]
  if (!sourceLocale) return existing

  const sourceText = existing[sourceLocale]
  if (!sourceText?.trim()) return existing

  const result: Record<string, string> = { ...existing }
  const missingLocales = TARGET_LOCALES.filter((locale) => !existing[locale]?.trim())

  if (missingLocales.length === 0) return existing

  await Promise.all(
    missingLocales.map(async (targetLocale) => {
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
            source_lang: LOCALE_TO_DEEPL[sourceLocale],
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

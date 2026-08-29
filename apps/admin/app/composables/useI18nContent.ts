/**
 * useI18nContent para el admin
 * El admin no usa @nuxtjs/i18n para esto — el fallback de contenido se arma a
 * partir de SOURCE_LOCALE + CONTENT_LOCALES (layers/domain/config/locales.ts),
 * no de una lista hardcodeada acá.
 */

export type I18nContent = Record<string, string>

export function useI18nContent() {
  const { locales, sourceLocale } = useContentLocales()
  const fallbackOrder = [sourceLocale, ...locales.filter((l) => l !== sourceLocale)]

  function tc(content: I18nContent | null | undefined): string {
    if (!content) return ''
    for (const locale of fallbackOrder) {
      if (content[locale]) return content[locale]
    }
    return Object.values(content)[0] || ''
  }

  function tcRef(content: I18nContent | null | undefined) {
    return computed(() => tc(content))
  }

  return { tc, tcRef }
}

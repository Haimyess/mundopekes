import { useI18n } from 'vue-i18n'

export type I18nContent = Record<string, string>

export function useI18nContent() {
  const { locale } = useI18n()
  const { locales, sourceLocale } = useContentLocales()
  // Prioridad de fallback: locale actual del visitante primero, luego
  // SOURCE_LOCALE (contenido siempre existe ahí), luego el resto de
  // CONTENT_LOCALES — ver layers/domain/config/locales.ts.
  const restLocales = locales.filter((l) => l !== sourceLocale)

  function tc(content: I18nContent | null | undefined): string {
    if (!content) return ''
    const current = locale.value as string
    const fallbackOrder = [current, sourceLocale, ...restLocales]
    for (const l of fallbackOrder) {
      if (content[l]) return content[l]
    }
    return Object.values(content)[0] || ''
  }

  function tcRef(content: I18nContent | null | undefined) {
    return computed(() => tc(content))
  }

  return { tc, tcRef, locale }
}

/**
 * useI18nContent para el admin
 * El admin no usa @nuxtjs/i18n — siempre muestra es → he → en → ru
 */

export type I18nContent = Record<string, string>

export function useI18nContent() {
  function tc(content: I18nContent | null | undefined): string {
    if (!content) return ''
    return (
      content['es'] ||
      content['he'] ||
      content['en'] ||
      content['ru'] ||
      Object.values(content)[0] ||
      ''
    )
  }

  function tcRef(content: I18nContent | null | undefined) {
    return computed(() => tc(content))
  }

  return { tc, tcRef }
}

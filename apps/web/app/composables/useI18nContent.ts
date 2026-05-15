import { useI18n } from 'vue-i18n'

export type I18nContent = Record<string, string>

export function useI18nContent() {
  const { locale } = useI18n()

  function tc(content: I18nContent | null | undefined): string {
    if (!content) return ''
    const current = locale.value as string
    return (
      content[current] ||
      content['es'] ||
      content['he'] ||
      content['en'] ||
      Object.values(content)[0] ||
      ''
    )
  }

  function tcRef(content: I18nContent | null | undefined) {
    return computed(() => tc(content))
  }

  return { tc, tcRef, locale }
}

import { CONTENT_LOCALE_META, isContentLocale } from '@mundopekes/i18n'
import type { ContentLocale } from '@mundopekes/i18n'

export function useLanguageSwitch() {
  const { locale, setLocale } = useI18n()

  const currentLocale = computed<ContentLocale>(() =>
    isContentLocale(locale.value) ? locale.value : 'he'
  )

  const switchLocale = async (code: ContentLocale) => {
    if (code === currentLocale.value) return
    await setLocale(code)
  }

  return { locales: CONTENT_LOCALE_META, currentLocale, switchLocale }
}

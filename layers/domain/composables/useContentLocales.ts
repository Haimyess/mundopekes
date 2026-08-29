import { CONTENT_LOCALE_META, CONTENT_LOCALES, SOURCE_LOCALE } from '../config/locales'

// Equivalente client-side de get-configured-locales.ts (server) — un solo
// punto para leer la lista de locales de contenido desde componentes/composables
// Vue, en vez de hardcodearla en cada uno (I18nTabs, useI18nContent, etc.).
export function useContentLocales() {
  return {
    localeMeta: CONTENT_LOCALE_META,
    locales: CONTENT_LOCALES,
    sourceLocale: SOURCE_LOCALE,
  }
}

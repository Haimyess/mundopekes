// Única fuente de verdad para los locales de CONTENIDO (name_i18n/description_i18n/
// title_i18n en places/activities/suggestions) — no confundir con los locales de
// INTERFAZ de cada app (apps/admin usa solo es/en para su propia UI). Antes esta
// misma lista vivía hardcodeada y duplicada en ~6 archivos distintos (translate.ts,
// useI18nContent.ts ×2, I18nTabs.vue, apps/web/app/types/i18n.ts); ahora todos esos
// puntos importan de acá, así que agregar/quitar un locale de contenido es un cambio
// en un solo lugar.
export const SOURCE_LOCALE = 'en'

export const CONTENT_LOCALE_META = [
  { code: 'es', name: 'Español', file: 'es.json' },
  { code: 'en', name: 'English', file: 'en.json' },
  { code: 'ru', name: 'Русский', file: 'ru.json' },
  { code: 'he', name: 'עברית', file: 'he.json' },
] as const

export const CONTENT_LOCALES = CONTENT_LOCALE_META.map((l) => l.code)

export type ContentLocale = (typeof CONTENT_LOCALES)[number]

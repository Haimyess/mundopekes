export const SOURCE_LOCALE = 'en'

export const CONTENT_LOCALE_META = [
  { code: 'es', name: 'Español', file: 'es.json' },
  { code: 'en', name: 'English', file: 'en.json' },
  { code: 'ru', name: 'Русский', file: 'ru.json' },
  { code: 'he', name: 'עברית', file: 'he.json' },
] as const

export type ContentLocale = (typeof CONTENT_LOCALE_META)[number]['code']

export const CONTENT_LOCALES: readonly ContentLocale[] = CONTENT_LOCALE_META.map(
  (locale) => locale.code
)

export const RTL_LOCALES: readonly ContentLocale[] = ['he']

export const isContentLocale = (value: unknown): value is ContentLocale =>
  typeof value === 'string' && (CONTENT_LOCALES as readonly string[]).includes(value)

export const isRtlLocale = (locale: ContentLocale): boolean => RTL_LOCALES.includes(locale)

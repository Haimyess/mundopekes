/**
 * Types para internacionalización
 */

export type LocaleCode = 'es' | 'en' | 'ru' | 'he'

export const LOCALE_CODES: LocaleCode[] = ['es', 'en', 'ru', 'he']

export const isValidLocale = (code: string): code is LocaleCode => {
  return LOCALE_CODES.includes(code as LocaleCode)
}
export type LocaleTranslationStatus = 'manual' | 'auto' | 'error'

export interface LocaleStatusEntry {
  status: LocaleTranslationStatus
  updatedAt: string
  error?: string
}

export interface FieldI18nStatus {
  sourceLocale: string
  [locale: string]: LocaleStatusEntry | string
}

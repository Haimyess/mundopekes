// Tipos del tracking de traducción (columna `i18n_status`, jsonb, en places/
// activities/suggestions) — viven acá (no en el server-only translation-
// service) porque tanto código de servidor (translation-service.ts) como
// componentes Vue (tabla de Suggestions, drawer) necesitan importarlos, y
// `layers/domain/server/**` no es alcanzable desde `app/**`.
export type LocaleTranslationStatus = 'manual' | 'auto' | 'error'

export interface LocaleStatusEntry {
  status: LocaleTranslationStatus
  updatedAt: string
  error?: string
}

// Shape guardado en `i18n_status`, una entrada por campo traducible
// (ej. i18n_status.name, i18n_status.description).
export interface FieldI18nStatus {
  sourceLocale: string
  [locale: string]: LocaleStatusEntry | string
}

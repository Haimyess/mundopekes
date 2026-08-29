import type { FieldI18nStatus } from '../types/i18n-status'

export type TranslationCompleteness = 'complete' | 'partial' | 'unknown'

export interface I18nStatusSummary {
  state: TranslationCompleteness
  // Locales que faltan o fallaron, para el/los campos consultados —
  // deduplicado, en el orden de `locales`.
  missingLocales: string[]
}

// Resume el `i18n_status` de una fila (places/activities/suggestions) para
// uno o más campos (ej. ['name','description']) contra la lista de locales
// configurados — usado tanto por la tabla de Suggestions como por los
// indicadores por-tab del drawer. Sólo mira `i18n_status`, no el contenido
// real de name_i18n/etc.: por construcción, un locale sólo tiene entrada acá
// si translateI18nField efectivamente le puso texto (manual/auto) o intentó
// y falló (error) — un locale sin entrada es "nunca se tradujo".
export function summarizeI18nStatus(
  i18nStatus: Record<string, FieldI18nStatus> | null | undefined,
  fields: readonly string[],
  locales: readonly string[]
): I18nStatusSummary {
  if (!i18nStatus || fields.length === 0) {
    return { state: 'unknown', missingLocales: [] }
  }

  const missing = new Set<string>()
  let sawAnyField = false

  for (const field of fields) {
    const fieldStatus = i18nStatus[field]
    if (!fieldStatus) continue
    sawAnyField = true

    for (const locale of locales) {
      const entry = fieldStatus[locale]
      const isMissing = !entry || typeof entry !== 'object' || entry.status === 'error'
      if (isMissing) missing.add(locale)
    }
  }

  if (!sawAnyField) return { state: 'unknown', missingLocales: [] }

  return {
    state: missing.size === 0 ? 'complete' : 'partial',
    missingLocales: locales.filter((l) => missing.has(l)),
  }
}

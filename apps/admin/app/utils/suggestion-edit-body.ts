// Pure helper extracted from SuggestionsSlideover.saveEdit / startEditing
// for unit-testability. Does not change any runtime behaviour.

export type EditForm = {
  name_i18n: Record<string, string>
  description_i18n: Record<string, string>
  location: { city: string; address: string }
  category_id: string
  age_range_ids: number[]
  best_season: string[]
  stroller_friendly: boolean
  open_weekends: boolean
  is_free: boolean
  schedule: string
  meta_title_i18n: Record<string, string>
  meta_phone: string
  meta_website: string
  meta_opening_hours_text: string
  meta_hours_unknown: boolean
}

export type SuggestionMetaForEdit = {
  title_i18n?: Record<string, string> | null
  phone?: string | null
  website?: string | null
  opening_hours_text?: string[] | null
  hours_unknown?: boolean | null
}

/** Builds the PUT body that saveEdit sends to the server. */
export function buildSaveBody(form: EditForm) {
  return {
    name_i18n: form.name_i18n,
    description_i18n: form.description_i18n,
    location: form.location,
    category_id: form.category_id || null,
    age_range: { ids: form.age_range_ids },
    best_season: form.best_season,
    stroller_friendly: form.stroller_friendly,
    open_weekends: form.open_weekends,
    is_free: form.is_free,
    schedule: form.schedule,
    metadata: {
      title_i18n: form.meta_title_i18n,
      phone: form.meta_phone || null,
      website: form.meta_website || null,
      opening_hours_text: form.meta_opening_hours_text
        ? form.meta_opening_hours_text.split('\n').filter(Boolean)
        : null,
      hours_unknown: form.meta_hours_unknown,
    },
  }
}

/** Seeds editForm from a suggestion + its metadata. */
export function initEditForm(
  suggestion: {
    name_i18n?: Record<string, string> | null
    description_i18n?: Record<string, string> | null
    location?: { city?: string; address?: string } | null
    category_id?: string | null
    age_range?: { ids?: number[] } | null
    best_season?: string[] | null
    stroller_friendly?: boolean
    open_weekends?: boolean
    is_free?: boolean
    schedule?: string | null
    metadata?: unknown
  },
  meta: SuggestionMetaForEdit
): EditForm {
  return {
    name_i18n: { ...(suggestion.name_i18n ?? {}) },
    description_i18n: { ...(suggestion.description_i18n ?? {}) },
    location: {
      city: suggestion.location?.city ?? '',
      address: suggestion.location?.address ?? '',
    },
    category_id: suggestion.category_id ?? '',
    age_range_ids: [...(suggestion.age_range?.ids ?? [])],
    best_season: [...(suggestion.best_season ?? [])],
    stroller_friendly: suggestion.stroller_friendly ?? false,
    open_weekends: suggestion.open_weekends ?? false,
    is_free: suggestion.is_free ?? false,
    schedule: suggestion.schedule ?? '',
    meta_title_i18n: { ...(meta.title_i18n ?? {}) },
    meta_phone: meta.phone ?? '',
    meta_website: meta.website ?? '',
    meta_opening_hours_text: Array.isArray(meta.opening_hours_text)
      ? meta.opening_hours_text.join('\n')
      : '',
    meta_hours_unknown: meta.hours_unknown === true,
  }
}

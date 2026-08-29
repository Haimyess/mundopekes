// Shared logic for turning an approved/merged suggestion into an `activities`
// row, used by both suggestions/[id]/approve.post.ts (experience_for_existing_place
// branch) and suggestions/[id]/merge.post.ts — both end up doing the exact same
// "attach this suggestion's experience data to an existing place_id" operation.
import { translateI18nField } from './translate'
import type { FieldI18nStatus } from './translate'
import type { Json } from '~/types/database.types'

type SuggestionMeta = {
  title_i18n?: Record<string, string> | null
  hours_unknown?: boolean | null
  schedule_structured?: unknown
  has_shadow?: boolean | null
  has_bathrooms?: boolean | null
  price?: number | null
  activity_website?: string | null
}

export interface SuggestionRowForActivity {
  id: string
  category_id: string | null
  is_free: boolean | null
  stroller_friendly: boolean | null
  open_weekends: boolean | null
  schedule: string | null
  images: string[] | null
  age_range: unknown
  best_season: string[] | null
  metadata: unknown
  name_i18n: unknown
}

export interface ActivityFromSuggestion {
  ageRangeIds: number[]
  bestSeasons: string[]
  payload: {
    place_id: string
    category_id: string | null
    title_i18n: Record<string, string>
    description_i18n: Record<string, string>
    is_free: boolean
    price: number | null
    stroller_friendly: boolean
    open_weekends: boolean
    schedule: string | null
    images: string[]
    status: 'approved'
    i18n_status: Json
    metadata: {
      from_suggestion: string
      hours_unknown: boolean
      schedule_structured: unknown
      age_range_ids: number[]
      has_shadow: boolean
      has_bathrooms: boolean
      website: string | null
    }
  }
}

export interface BuildActivityInsertOptions {
  // Only used by the new_place_with_experience approval path, which reuses
  // the (just-enriched) place description — and its translation status —
  // for the activity too, see approve.post.ts. Every other caller
  // (experience_for_existing_place approval, merge) leaves these unset: the
  // place already has its own description, an activity attached to it
  // doesn't need a duplicate.
  descriptionI18nOverride?: Record<string, string>
  descriptionI18nStatusOverride?: FieldI18nStatus
  // Pre-resolved images (see resolve-suggestion-images.ts) — computed once
  // by the caller so a suggestion's Google photos get promoted to permanent
  // Storage URLs exactly once per approve/merge, not once per entity.
  imagesOverride?: string[]
}

export async function buildActivityInsertFromSuggestion(
  suggestion: SuggestionRowForActivity,
  placeId: string,
  deeplApiKey: string | undefined,
  options: BuildActivityInsertOptions = {}
): Promise<ActivityFromSuggestion> {
  const { descriptionI18nOverride, descriptionI18nStatusOverride, imagesOverride } = options
  const meta = (suggestion.metadata as SuggestionMeta | null) ?? {}
  const ageRange = (suggestion.age_range as { ids?: number[] } | null) ?? {}
  const bestSeasons = (suggestion.best_season as string[]) ?? []

  const rawName = (suggestion.name_i18n as Record<string, string>) ?? {}
  const rawTitle =
    meta.title_i18n && Object.keys(meta.title_i18n).length > 0 ? meta.title_i18n : null
  const source = rawTitle ?? rawName
  let title_i18n: Record<string, string> = source
  let titleStatus: FieldI18nStatus | undefined
  if (deeplApiKey) {
    const translated = await translateI18nField({ existing: source, apiKey: deeplApiKey })
    title_i18n = translated.value
    titleStatus = translated.status
  }

  const hoursUnknown = meta.hours_unknown === true
  const activityPrice: number | null = suggestion.is_free
    ? null
    : typeof meta.price === 'number'
      ? meta.price
      : null

  const ageRangeIds = ageRange.ids ?? []

  return {
    ageRangeIds,
    bestSeasons,
    payload: {
      place_id: placeId,
      category_id: suggestion.category_id ?? null,
      title_i18n,
      description_i18n: descriptionI18nOverride ?? {},
      is_free: suggestion.is_free ?? true,
      price: activityPrice,
      stroller_friendly: suggestion.stroller_friendly ?? false,
      open_weekends: suggestion.open_weekends ?? false,
      schedule: hoursUnknown ? null : suggestion.schedule,
      images: imagesOverride ?? suggestion.images ?? [],
      status: 'approved',
      i18n_status: {
        ...(titleStatus ? { title: titleStatus } : {}),
        ...(descriptionI18nStatusOverride ? { description: descriptionI18nStatusOverride } : {}),
      } as Json,
      metadata: {
        from_suggestion: suggestion.id,
        hours_unknown: hoursUnknown,
        schedule_structured: hoursUnknown ? null : (meta.schedule_structured ?? null),
        age_range_ids: ageRangeIds,
        has_shadow: meta.has_shadow ?? false,
        has_bathrooms: meta.has_bathrooms ?? false,
        website: meta.activity_website ?? null,
      },
    },
  }
}

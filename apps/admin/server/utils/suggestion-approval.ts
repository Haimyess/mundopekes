// Shared logic for turning an approved/merged suggestion into an `activities`
// row, used by both suggestions/[id]/approve.post.ts (experience_for_existing_place
// branch) and suggestions/[id]/merge.post.ts — both end up doing the exact same
// "attach this suggestion's experience data to an existing place_id" operation.
import type { SupabaseClient } from '@supabase/supabase-js'
import { translateI18nField } from './translate'
import type { FieldI18nStatus } from './translate'
import type { Json, Database } from '~/types/database.types'

type PlaceRow = Database['public']['Tables']['places']['Row']

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

type PlaceSuggestionMeta = {
  google_place_id?: string | null
  place_photo_url?: string | null
  google_types?: string[] | null
  google_url?: string | null
  phone?: string | null
  website?: string | null
  wheelchair?: boolean | null
  opening_hours_text?: string[] | null
  photos?: string[] | null
  has_shadow?: boolean | null
  has_bathrooms?: boolean | null
  hours_unknown?: boolean | null
  schedule_structured?: unknown
}

export interface PlaceSuggestionRow {
  id: string
  name_i18n: unknown
  description_i18n: unknown
  location: unknown
  metadata: unknown
  stroller_friendly: boolean | null
  open_weekends: boolean | null
  flagged_possible_duplicate: boolean | null
}

// Turns a `new_place_with_experience` suggestion (or, for a grouped
// submission, its `is_primary` sibling) into a real `places` row — shared by
// the single-suggestion approval path and the grouped "1 place + N
// activities" path in approve.post.ts, which both need to create the place
// exactly once from the same source data.
export async function createPlaceFromSuggestion(
  supabase: SupabaseClient,
  suggestion: PlaceSuggestionRow,
  deeplApiKey: string | undefined,
  resolvedImages: string[]
): Promise<{ place: PlaceRow | null; error: string | null; freshDuplicatePlaceId: string | null }> {
  const meta = (suggestion.metadata as PlaceSuggestionMeta | null) ?? {}

  const rawName = (suggestion.name_i18n as Record<string, string>) ?? {}
  let name_i18n = rawName
  let nameStatus: FieldI18nStatus | undefined
  if (deeplApiKey) {
    const translated = await translateI18nField({ existing: rawName, apiKey: deeplApiKey })
    name_i18n = translated.value
    nameStatus = translated.status
  }

  const rawDesc = (suggestion.description_i18n as Record<string, string>) ?? {}
  let description_i18n = rawDesc
  let descriptionStatus: FieldI18nStatus | undefined
  if (deeplApiKey && Object.keys(rawDesc).length > 0) {
    const translated = await translateI18nField({ existing: rawDesc, apiKey: deeplApiKey })
    description_i18n = translated.value
    descriptionStatus = translated.status
  }

  const location = suggestion.location as {
    city?: string
    address?: string
    lat?: number
    lng?: number
  } | null

  let city_id: number | null = null
  if (location?.city) {
    const { data: existingCity } = await supabase
      .from('cities')
      .select('id')
      .ilike('name', location.city)
      .single()

    if (existingCity) {
      city_id = existingCity.id
    } else {
      const { data: newCity } = await supabase
        .from('cities')
        .insert({ name: location.city })
        .select('id')
        .single()
      city_id = newCity?.id ?? null
    }
  }

  let lat: number | null = location?.lat ?? null
  let lng: number | null = location?.lng ?? null

  if (lat === null) {
    const geoQuery = [location?.address, location?.city].filter(Boolean).join(', ')
    if (geoQuery) {
      const coords = await geocodeAddress(geoQuery)
      if (coords) {
        lat = coords.lat
        lng = coords.lng
      }
    }
  }

  const nameText = Object.values(name_i18n)[0] ?? ''

  // Re-check for duplicates right before inserting — the flag computed at
  // submission time may be stale. Non-blocking: still creates the place,
  // just returns the match so the caller can persist an updated flag.
  let freshDuplicatePlaceId: string | null = null
  if (!suggestion.flagged_possible_duplicate && nameText) {
    const freshDuplicates = await findPlaceDuplicates(supabase, {
      name: nameText,
      lat,
      lng,
      googlePlaceId: meta.google_place_id ?? null,
      cityId: city_id,
    })
    freshDuplicatePlaceId = freshDuplicates[0]?.id ?? null
  }

  const placePayload = {
    name_i18n,
    description_i18n,
    city_id,
    lat,
    lng,
    images: resolvedImages,
    status: 'active',
    google_place_id: meta.google_place_id ?? null,
    name_normalized: normalizeName(nameText),
    i18n_status: {
      ...(nameStatus ? { name: nameStatus } : {}),
      ...(descriptionStatus ? { description: descriptionStatus } : {}),
    } as Json,
    metadata: {
      google_place_id: meta.google_place_id ?? null,
      phone: meta.phone ?? null,
      website: sanitizeHttpUrl(meta.website),
      google_url: meta.google_url ?? null,
      wheelchair: meta.wheelchair ?? null,
      opening_hours_text: meta.opening_hours_text?.length ? meta.opening_hours_text : null,
      place_photo_url: meta.place_photo_url ?? null,
      photos: meta.photos?.length ? meta.photos : null,
      stroller_friendly: suggestion.stroller_friendly ?? false,
      open_weekends: suggestion.open_weekends ?? false,
      has_shadow: meta.has_shadow ?? false,
      has_bathrooms: meta.has_bathrooms ?? false,
      hours_unknown: meta.hours_unknown === true,
      schedule_structured: meta.hours_unknown === true ? null : (meta.schedule_structured ?? null),
      from_suggestion: suggestion.id,
    },
  }

  const { data: place, error } = await supabase
    .from('places')
    .insert(placePayload)
    .select()
    .single()

  return { place: place as PlaceRow | null, error: error?.message ?? null, freshDuplicatePlaceId }
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

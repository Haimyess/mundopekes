import type { SupabaseClient } from '@supabase/supabase-js'
import type { DiscoveredPlace } from './1-discover.js'
import type { PlaceDetails } from './3-details.js'
import type { EnrichedData, ScheduleStructured } from './5-enrich.js'
import { CATEGORIES_LIST } from '../config/categories.js'

const DAYS: Array<keyof ScheduleStructured> = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]
const DAY_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Israeli addresses from Google are typically "street number, city, Israel" —
// the city is the segment right before the trailing country, if there is one,
// otherwise it's the last segment (e.g. small localities with no street: "Gan Shmuel, Israel").
export function extractCity(formattedAddress: string): string {
  const parts = formattedAddress.split(', ').map((p) => p.trim())
  if (parts.length === 0) return ''

  const last = parts[parts.length - 1]
  const hasCountrySuffix = last === 'ישראל' || last === 'Israel'
  const cityIndex = hasCountrySuffix ? parts.length - 2 : parts.length - 1

  return parts[cityIndex] ?? parts[0] ?? ''
}

function buildScheduleText(schedule: ScheduleStructured): string {
  return DAYS.map((day, i) => {
    const d = schedule[day]
    if (!d?.open) return null
    return `${DAY_ES[i]}: ${d.start}–${d.end}`
  })
    .filter(Boolean)
    .join(', ')
}

export async function ingestSuggestion(
  place: DiscoveredPlace,
  details: PlaceDetails,
  enriched: EnrichedData,
  supabase: SupabaseClient
): Promise<{ id: string }> {
  const city = extractCity(place.formatted_address)
  const scheduleText = buildScheduleText(enriched.schedule_structured)
  const categoryName =
    CATEGORIES_LIST.find((c) => c.id === enriched.category_id)?.name ?? enriched.category_id

  const photoUrl = place.photo_reference
    ? `/api/places/photo?ref=${encodeURIComponent(place.photo_reference)}`
    : null
  const photos = details.photo_references.map(
    (ref) => `/api/places/photo?ref=${encodeURIComponent(ref)}`
  )

  // Google's per-locale name lookup (details.name_i18n) falls back to the
  // Hebrew name when no localized listing exists — Haiku's translation is
  // the reliable source for es/en/ru, `he` stays sourced from Google/scrape.
  const name_i18n = { he: details.name_i18n.he, ...enriched.name_i18n }
  const description_i18n = details.description_he
    ? { he: details.description_he, ...enriched.description_i18n }
    : enriched.description_i18n

  const { data, error } = await supabase
    .from('suggestions')
    .insert({
      name_i18n,
      description_i18n,

      location: {
        address: place.formatted_address,
        city,
        lat: place.lat,
        lng: place.lng,
      },

      category_id: enriched.category_id,
      age_range: { ids: enriched.age_range_ids },
      type: [categoryName],
      best_season: enriched.best_season,
      is_free: enriched.is_free,
      stroller_friendly: enriched.stroller_friendly,
      open_weekends: enriched.open_weekends,
      schedule: scheduleText,
      images: [],
      status: 'pending',

      metadata: {
        google_place_id: place.place_id,
        place_photo_url: photoUrl,
        photos,
        phone: details.phone,
        website: details.website,
        google_url: details.google_url,
        opening_hours_text: details.opening_hours_text,
        schedule_structured: enriched.schedule_structured,
        age_range_ids: enriched.age_range_ids,
        wheelchair: details.wheelchair_accessible,
        is_free_confidence: enriched.is_free_confidence,

        source: 'agent',
        agent_version: '1.0.0',
        ingested_at: new Date().toISOString(),
        website_scraped: !!details.website,
      },
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to insert suggestion: ${error?.message}`)
  }

  return { id: data.id as string }
}

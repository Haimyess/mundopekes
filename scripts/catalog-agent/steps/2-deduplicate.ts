import type { SupabaseClient } from '@supabase/supabase-js'
import type { DiscoveredPlace } from './1-discover.js'

// Loads every google_place_id already known to Supabase — both agent-created suggestions
// and places already published — so discovery never re-processes the same place twice.
export async function loadExistingPlaceIds(supabase: SupabaseClient): Promise<Set<string>> {
  const [suggestionsRes, placesRes] = await Promise.all([
    supabase
      .from('suggestions')
      .select('metadata->>google_place_id')
      .eq('metadata->>source', 'agent'),
    supabase
      .from('places')
      .select('metadata->>google_place_id')
      .not('metadata->>google_place_id', 'is', null),
  ])

  if (suggestionsRes.error) {
    throw new Error(`Failed to load existing suggestion place_ids: ${suggestionsRes.error.message}`)
  }
  if (placesRes.error) {
    throw new Error(`Failed to load existing place place_ids: ${placesRes.error.message}`)
  }

  const ids = new Set<string>()
  for (const row of (suggestionsRes.data ?? []) as Array<Record<string, string | null>>) {
    const id = row.google_place_id
    if (id) ids.add(id)
  }
  for (const row of (placesRes.data ?? []) as Array<Record<string, string | null>>) {
    const id = row.google_place_id
    if (id) ids.add(id)
  }

  return ids
}

export function deduplicateByGooglePlaceId(
  places: DiscoveredPlace[],
  existingIds: Set<string>
): DiscoveredPlace[] {
  return places.filter((place) => !existingIds.has(place.place_id))
}

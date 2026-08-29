// Duplicate detection for the Place/Experience suggestion pipeline.
// Uses only data that already exists in the project (google_place_id,
// places.name_normalized, lat/lng, activities per place) — no external
// services. Shared between apps/web (submit-time check) and apps/admin
// (nothing calls this from admin yet, but it lives here so it can).
import type { SupabaseClient } from '@supabase/supabase-js'

export function normalizeName(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '') // strip diacritics (Unicode "Mark, nonspacing"), mirrors SQL unaccent()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function extractText(i18n: unknown): string {
  if (!i18n || typeof i18n !== 'object') return ''
  const rec = i18n as Record<string, string>
  return rec.es ?? Object.values(rec)[0] ?? ''
}

// Haversine distance in meters between two coordinates.
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Bounding box for a proximity prefilter (cheap index-backed query before the
// exact haversine check in JS). ~radiusMeters in every direction.
function boundingBox(lat: number, lng: number, radiusMeters: number) {
  const latDelta = radiusMeters / 111_320
  const lngDelta = radiusMeters / (111_320 * Math.cos((lat * Math.PI) / 180) || 1)
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  }
}

export interface PlaceDuplicateMatch {
  id: string
  name: string
  city_id: number | null
  confidence: 'high' | 'medium'
  reason: 'google_place_id' | 'exact_name_city' | 'nearby_similar_name'
}

export interface FindPlaceDuplicatesParams {
  name: string
  lat?: number | null
  lng?: number | null
  googlePlaceId?: string | null
  cityId?: number | null
}

export async function findPlaceDuplicates(
  supabase: SupabaseClient,
  params: FindPlaceDuplicatesParams
): Promise<PlaceDuplicateMatch[]> {
  const normalized = normalizeName(params.name)

  // 1. Exact google_place_id match — authoritative, short-circuit.
  if (params.googlePlaceId) {
    const { data } = await supabase
      .from('places')
      .select('id, name_i18n, city_id')
      .eq('google_place_id', params.googlePlaceId)
      .limit(1)
    if (data?.length) {
      const row = data[0] as { id: string; name_i18n: unknown; city_id: number | null }
      return [
        {
          id: row.id,
          name: extractText(row.name_i18n),
          city_id: row.city_id,
          confidence: 'high',
          reason: 'google_place_id',
        },
      ]
    }
  }

  if (!normalized) return []

  // 2. Exact normalized-name match, scoped to city when known.
  {
    let query = supabase
      .from('places')
      .select('id, name_i18n, city_id')
      .eq('name_normalized', normalized)
    if (params.cityId != null) query = query.eq('city_id', params.cityId)
    const { data } = await query.limit(5)
    if (data?.length) {
      return (data as { id: string; name_i18n: unknown; city_id: number | null }[]).map((row) => ({
        id: row.id,
        name: extractText(row.name_i18n),
        city_id: row.city_id,
        confidence: 'high' as const,
        reason: 'exact_name_city' as const,
      }))
    }
  }

  // 3. Proximity + partial-name match (medium confidence).
  if (params.lat != null && params.lng != null) {
    const box = boundingBox(params.lat, params.lng, 300)
    const { data } = await supabase
      .from('places')
      .select('id, name_i18n, city_id, lat, lng, name_normalized')
      .gte('lat', box.minLat)
      .lte('lat', box.maxLat)
      .gte('lng', box.minLng)
      .lte('lng', box.maxLng)
      .limit(20)

    const matches: PlaceDuplicateMatch[] = []
    for (const row of (data ?? []) as {
      id: string
      name_i18n: unknown
      city_id: number | null
      lat: number | null
      lng: number | null
      name_normalized: string | null
    }[]) {
      if (row.lat == null || row.lng == null) continue
      const dist = distanceMeters(params.lat, params.lng, row.lat, row.lng)
      if (dist > 300) continue
      const rowNormalized = row.name_normalized ?? normalizeName(extractText(row.name_i18n))
      if (!rowNormalized) continue
      if (rowNormalized.includes(normalized) || normalized.includes(rowNormalized)) {
        matches.push({
          id: row.id,
          name: extractText(row.name_i18n),
          city_id: row.city_id,
          confidence: 'medium',
          reason: 'nearby_similar_name',
        })
      }
    }
    if (matches.length) return matches
  }

  return []
}

export interface ActivityDuplicateMatch {
  id: string
  title: string
  confidence: 'high' | 'medium'
  reason: 'exact_title' | 'same_category_similar_title'
}

export interface FindExperienceDuplicatesParams {
  placeId: string
  title: string
  categoryId?: string | null
}

export async function findExperienceDuplicates(
  supabase: SupabaseClient,
  params: FindExperienceDuplicatesParams
): Promise<ActivityDuplicateMatch[]> {
  const normalized = normalizeName(params.title)
  if (!normalized) return []

  const { data } = await supabase
    .from('activities')
    .select('id, title_i18n, category_id')
    .eq('place_id', params.placeId)
    .in('status', ['pending', 'approved'])

  const matches: ActivityDuplicateMatch[] = []
  for (const row of (data ?? []) as {
    id: string
    title_i18n: unknown
    category_id: string | null
  }[]) {
    const rowTitle = extractText(row.title_i18n)
    const rowNormalized = normalizeName(rowTitle)
    if (!rowNormalized) continue

    if (rowNormalized === normalized) {
      matches.push({ id: row.id, title: rowTitle, confidence: 'high', reason: 'exact_title' })
      continue
    }

    if (
      params.categoryId &&
      row.category_id === params.categoryId &&
      (rowNormalized.includes(normalized) || normalized.includes(rowNormalized))
    ) {
      matches.push({
        id: row.id,
        title: rowTitle,
        confidence: 'medium',
        reason: 'same_category_similar_title',
      })
    }
  }

  return matches
}

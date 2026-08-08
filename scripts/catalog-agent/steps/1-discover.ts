import { logError } from '../utils/logger.js'

export interface DiscoveredPlace {
  place_id: string
  name: string
  formatted_address: string
  lat: number | null
  lng: number | null
  types: string[]
  photo_reference: string | null
}

interface RawGooglePlace {
  place_id: string
  name: string
  formatted_address: string
  geometry?: { location?: { lat: number; lng: number } }
  types?: string[]
  photos?: { photo_reference: string }[]
}

interface GoogleTextSearchResponse {
  status: string
  results?: RawGooglePlace[]
}

// Places whose types match these are not relevant family activities — discard before returning.
const EXCLUDED_TYPES = new Set([
  'national_park',
  'lodging',
  'hotel',
  'casino',
  'night_club',
  'bar',
  'liquor_store',
])

function buildSearchUrl(query: string, key: string): string {
  return [
    'https://maps.googleapis.com/maps/api/place/textsearch/json',
    `?query=${encodeURIComponent(query.trim())}`,
    `&region=il`,
    `&language=he`,
    `&key=${key}`,
  ].join('')
}

export async function discover(query: string): Promise<DiscoveredPlace[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY as string
  const url = buildSearchUrl(query, key)

  let data: GoogleTextSearchResponse
  try {
    const res = await fetch(url)
    data = (await res.json()) as GoogleTextSearchResponse
  } catch (err) {
    logError(`Error connecting to Google Places for query "${query}"`, { error: String(err) })
    throw err
  }

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places textsearch returned ${data.status} for query "${query}"`)
  }

  const results = (data.results ?? []).slice(0, 20)

  return results
    .filter((place) => !(place.types ?? []).some((t) => EXCLUDED_TYPES.has(t)))
    .map((place) => ({
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      lat: place.geometry?.location?.lat ?? null,
      lng: place.geometry?.location?.lng ?? null,
      types: place.types ?? [],
      photo_reference: place.photos?.[0]?.photo_reference ?? null,
    }))
}

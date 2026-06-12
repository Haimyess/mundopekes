// Geocode an address via Nominatim (OpenStreetMap, no API key required).
// Returns null and never throws — callers must never block on geocoding.
export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(query.trim())
    const results = await $fetch<Array<{ lat: string; lon: string }>>(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=il`,
      { headers: { 'User-Agent': 'MundoPekes/1.0 (contact@mundopekes.com)' } }
    )
    if (!results?.length) return null
    return {
      lat: Number.parseFloat(results[0]!.lat),
      lng: Number.parseFloat(results[0]!.lon),
    }
  } catch {
    return null
  }
}

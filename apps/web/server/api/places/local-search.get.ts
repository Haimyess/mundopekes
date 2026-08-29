// Searches MundoPekes' OWN `places` table (not Google) — this is the primary
// "does this place already exist?" lookup used by the suggestion wizard's
// place step, to avoid minting duplicate places for the same physical spot.
// Deliberately named `local-search`, distinct from the Google-proxy route at
// `layers/domain/server/api/places/search.get.ts` (also mounted at
// `/api/places/*` inside this app), to avoid a route-path collision.
import { serverSupabaseClient } from '#supabase/server'

export interface LocalPlaceSearchResult {
  id: string
  name_i18n: Record<string, string>
  lat: number | null
  lng: number | null
  thumbnail: string | null
  google_place_id: string | null
  city: { id: number; name: string } | null
}

interface PlaceRow {
  id: string
  name_i18n: Record<string, string>
  lat: number | null
  lng: number | null
  images: string[] | null
  google_place_id: string | null
  city: { id: number; name: string } | { id: number; name: string }[] | null
}

export default defineEventHandler(async (event) => {
  await checkRateLimit(event, 'places/local-search', { limit: 30, windowSeconds: 60 })

  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const cityId = query.city_id ? Number(query.city_id) : undefined

  if (q.length < 2) {
    return { places: [] }
  }

  const normalized = normalizeName(q)
  const client = await serverSupabaseClient(event)

  let dbQuery = client
    .from('places')
    .select('id, name_i18n, lat, lng, images, google_place_id, city:cities(id, name)')
    .eq('status', 'active')
    .ilike('name_normalized', `%${normalized}%`)
    .limit(8)

  if (cityId && !Number.isNaN(cityId)) {
    dbQuery = dbQuery.eq('city_id', cityId)
  }

  const { data, error } = await dbQuery

  if (error) {
    await logError(event, 'places/local-search', 'Failed to search places', {
      q,
      error: error.message,
    })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const places: LocalPlaceSearchResult[] = ((data ?? []) as unknown as PlaceRow[]).map((row) => {
    const city = Array.isArray(row.city) ? (row.city[0] ?? null) : row.city
    return {
      id: row.id,
      name_i18n: row.name_i18n,
      lat: row.lat,
      lng: row.lng,
      thumbnail: row.images?.[0] ?? null,
      google_place_id: row.google_place_id,
      city: city ? { id: city.id, name: city.name } : null,
    }
  })

  return { places }
})

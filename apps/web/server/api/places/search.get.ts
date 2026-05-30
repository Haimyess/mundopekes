// server/api/places/search.get.ts
import { defineEventHandler, getQuery, createError } from 'h3'
import { logError, logInfo } from '../../utils/logger'

const GOOGLE_TYPES_MAP: Record<string, { id: string; name: string }> = {
  beach: { id: '30d7ea34-bcf8-4209-b418-cdede2e431e6', name: 'Agua y playas' },
  park: { id: '5364a238-ba30-4d4c-846d-91bb0fda0095', name: 'Parques' },
  natural_feature: { id: '3e9f033e-f594-488d-98bf-a809cbd91299', name: 'Naturaleza' },
  nature_reserve: { id: '3e9f033e-f594-488d-98bf-a809cbd91299', name: 'Naturaleza' },
  museum: { id: '0f35ac9a-3c24-4224-ad35-0de0a7ff7035', name: 'Museos' },
  art_gallery: { id: '2027495d-0003-4308-b16b-586dfea6adbb', name: 'Arte' },
  place_of_worship: { id: 'a1287296-46a8-4973-b892-5dca978c06a7', name: 'Religioso' },
  zoo: { id: 'f5adf8e8-bb7b-4b12-af87-0789a401149c', name: 'Animales' },
  aquarium: { id: 'f5adf8e8-bb7b-4b12-af87-0789a401149c', name: 'Animales' },
  amusement_park: { id: '4de2060d-173a-4733-8bb4-10d25c1a622d', name: 'Juego y recreo' },
  campground: { id: '49ca0529-1130-43f7-a439-3198d7ac5b56', name: 'Camping' },
  restaurant: { id: '05031276-9b35-4d51-b4d4-2da8de4e03fe', name: 'Gastronomía' },
  food: { id: '05031276-9b35-4d51-b4d4-2da8de4e03fe', name: 'Gastronomía' },
  stadium: { id: 'fdbe1e25-ee11-484f-9177-99ffe978a8d5', name: 'Deportes' },
  gym: { id: 'fdbe1e25-ee11-484f-9177-99ffe978a8d5', name: 'Deportes' },
  ski_resort: { id: '3c9bd581-ea1b-4e96-b2f1-d45775425e46', name: 'Ski' },
  library: { id: '82e97ad6-e5a9-46cb-a394-209b593d5526', name: 'Educativo' },
  school: { id: '82e97ad6-e5a9-46cb-a394-209b593d5526', name: 'Educativo' },
  tourist_attraction: { id: 'a95dbfb7-1324-48c6-9aa1-43952c21151a', name: 'Historia' },
}

interface GooglePlace {
  place_id: string
  name: string
  formatted_address: string
  geometry: { location: { lat: number; lng: number } }
  photos?: { photo_reference: string }[]
  types: string[]
}

interface GoogleTextSearchResponse {
  status: string
  results: GooglePlace[]
}

const VALID_LANGS = new Set(['es', 'en', 'he', 'ru'])

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const q = query.q
  const rawLang = typeof query.lang === 'string' ? query.lang : ''
  const lang = VALID_LANGS.has(rawLang) ? rawLang : 'he'

  if (!q || typeof q !== 'string' || q.trim().length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'Query mínimo 3 caracteres' })
  }

  const key = config.googlePlacesApiKey as string
  if (!key) {
    throw createError({ statusCode: 500, statusMessage: 'API key no configurada' })
  }

  await logInfo(event, 'places/search', 'Searching places', { q, lang })

  const searchUrl = [
    'https://maps.googleapis.com/maps/api/place/textsearch/json',
    `?query=${encodeURIComponent(q.trim())}`,
    `&region=il`,
    `&language=${lang}`,
    `&key=${key}`,
  ].join('')

  let searchData: GoogleTextSearchResponse

  try {
    const res = await fetch(searchUrl)
    searchData = (await res.json()) as GoogleTextSearchResponse
  } catch (err) {
    await logError(event, 'places/search', 'Error conectando con Google Places', {
      error: String(err),
    })
    throw createError({ statusCode: 502, statusMessage: 'Error conectando con Google Places' })
  }

  if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
    await logError(event, 'places/search', 'Google Places returned unexpected status', {
      status: searchData.status,
      q,
    })
    throw createError({ statusCode: 502, statusMessage: `Google Places: ${searchData.status}` })
  }

  const results = (searchData.results ?? []).slice(0, 5)

  const places = results.map((place) => {
    const photoRef = place.photos?.[0]?.photo_reference ?? null
    const photoUrl = photoRef ? `/api/places/photo?ref=${encodeURIComponent(photoRef)}` : null

    const seen = new Set<string>()
    const suggestedCategories: { id: string; name: string }[] = []

    for (const type of place.types) {
      const match = GOOGLE_TYPES_MAP[type]
      if (match && !seen.has(match.id)) {
        seen.add(match.id)
        suggestedCategories.push({ id: match.id, name: match.name })
      }
    }

    return {
      google_place_id: place.place_id,
      name: place.name,
      name_i18n: { [lang]: place.name },
      address: place.formatted_address,
      lat: place.geometry?.location?.lat ?? null,
      lng: place.geometry?.location?.lng ?? null,
      photo_url: photoUrl,
      photo_ref: photoRef,
      types: place.types,
      suggested_categories: suggestedCategories.slice(0, 3),
    }
  })

  return { places }
})

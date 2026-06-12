// Pure helpers extracted from server/api/places handlers for testability.
// These contain no Nuxt runtime dependencies (no useRuntimeConfig, etc.).

export const VALID_LANGS = new Set(['es', 'en', 'he', 'ru'])

export const GOOGLE_TYPES_MAP: Record<string, { id: string; name: string }> = {
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

export function resolveSearchLang(raw: string): string {
  return VALID_LANGS.has(raw) ? raw : 'he'
}

export function buildSearchUrl(q: string, lang: string, key: string): string {
  return [
    'https://maps.googleapis.com/maps/api/place/textsearch/json',
    `?query=${encodeURIComponent(q.trim())}`,
    `&region=il`,
    `&language=${lang}`,
    `&key=${key}`,
  ].join('')
}

export function buildDetailsUrl(placeId: string, lang: string, key: string): string {
  return [
    'https://maps.googleapis.com/maps/api/place/details/json',
    `?place_id=${encodeURIComponent(placeId)}`,
    `&language=${lang}`,
    `&fields=name,editorial_summary,formatted_phone_number,website,opening_hours,photos,wheelchair_accessible_entrance,url`,
    `&key=${key}`,
  ].join('')
}

export function buildNameUrl(placeId: string, lang: string, key: string): string {
  return [
    'https://maps.googleapis.com/maps/api/place/details/json',
    `?place_id=${encodeURIComponent(placeId)}`,
    `&language=${lang}`,
    `&fields=name`,
    `&key=${key}`,
  ].join('')
}

export type RawGooglePlace = {
  place_id: string
  name: string
  formatted_address: string
  geometry: { location: { lat: number; lng: number } }
  photos?: { photo_reference: string }[]
  types: string[]
}

export function mapSearchResult(place: RawGooglePlace, lang: string) {
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
}

export type RawGoogleDetailsResult = {
  name: string
  editorial_summary?: { overview: string }
  formatted_phone_number?: string
  website?: string
  opening_hours?: { weekday_text: string[]; periods: unknown[] }
  photos?: { photo_reference: string }[]
  wheelchair_accessible_entrance?: boolean
  url?: string
}

export function mapDetailsResponse(
  main: RawGoogleDetailsResult,
  heResult: string,
  esResult: string,
  enResult: string,
  ruResult: string,
  lang: string
) {
  const name_i18n: Record<string, string> = {
    he: heResult || main.name,
    es: esResult || main.name,
    en: enResult || main.name,
    ru: ruResult || main.name,
    [lang]: main.name,
  }

  const description_i18n: Record<string, string> = {}
  if (main.editorial_summary?.overview) {
    description_i18n[lang] = main.editorial_summary.overview
  }

  const photos = (main.photos ?? [])
    .slice(0, 5)
    .map((p) => `/api/places/photo?ref=${encodeURIComponent(p.photo_reference)}`)

  return {
    name_i18n,
    description_i18n,
    phone: main.formatted_phone_number ?? null,
    website: main.website ?? null,
    google_url: main.url ?? null,
    wheelchair_accessible: main.wheelchair_accessible_entrance ?? null,
    opening_hours: main.opening_hours
      ? { weekday_text: main.opening_hours.weekday_text, periods: main.opening_hours.periods }
      : null,
    photos,
  }
}

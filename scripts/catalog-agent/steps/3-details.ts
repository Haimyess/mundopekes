// Replicates the logic in layers/domain/server/api/places/details.get.ts and
// layers/domain/server/utils/places-logic.ts (buildDetailsUrl / buildNameUrl / mapDetailsResponse),
// fixed to lang='he' as the primary details call plus es/en/ru name-only calls.
export interface PlaceDetails {
  name_i18n: { he: string; es: string; en: string; ru: string }
  description_he: string | null
  phone: string | null
  website: string | null
  google_url: string | null
  wheelchair_accessible: boolean | null
  opening_hours_text: string[]
  photo_references: string[]
}

interface RawGoogleDetailsResult {
  name: string
  editorial_summary?: { overview: string }
  formatted_phone_number?: string
  website?: string
  opening_hours?: { weekday_text: string[] }
  photos?: { photo_reference: string }[]
  wheelchair_accessible_entrance?: boolean
  url?: string
}

interface GooglePlaceDetailsResponse {
  status: string
  result?: RawGoogleDetailsResult
}

interface GooglePlaceNameResponse {
  status: string
  result?: { name: string }
}

function buildDetailsUrl(placeId: string, lang: string, key: string): string {
  return [
    'https://maps.googleapis.com/maps/api/place/details/json',
    `?place_id=${encodeURIComponent(placeId)}`,
    `&language=${lang}`,
    `&fields=name,editorial_summary,formatted_phone_number,website,opening_hours,photos,wheelchair_accessible_entrance,url`,
    `&key=${key}`,
  ].join('')
}

function buildNameUrl(placeId: string, lang: string, key: string): string {
  return [
    'https://maps.googleapis.com/maps/api/place/details/json',
    `?place_id=${encodeURIComponent(placeId)}`,
    `&language=${lang}`,
    `&fields=name`,
    `&key=${key}`,
  ].join('')
}

export async function fetchDetails(placeId: string): Promise<PlaceDetails> {
  const key = process.env.GOOGLE_PLACES_API_KEY as string

  const [mainData, heData, esData, enData, ruData] = await Promise.all([
    fetch(buildDetailsUrl(placeId, 'he', key)).then((r) =>
      r.json()
    ) as Promise<GooglePlaceDetailsResponse>,
    fetch(buildNameUrl(placeId, 'he', key)).then((r) =>
      r.json()
    ) as Promise<GooglePlaceNameResponse>,
    fetch(buildNameUrl(placeId, 'es', key)).then((r) =>
      r.json()
    ) as Promise<GooglePlaceNameResponse>,
    fetch(buildNameUrl(placeId, 'en', key)).then((r) =>
      r.json()
    ) as Promise<GooglePlaceNameResponse>,
    fetch(buildNameUrl(placeId, 'ru', key)).then((r) =>
      r.json()
    ) as Promise<GooglePlaceNameResponse>,
  ])

  if (mainData.status !== 'OK' || !mainData.result) {
    throw new Error(`Google Places details returned ${mainData.status} for place_id ${placeId}`)
  }

  const main = mainData.result

  return {
    name_i18n: {
      he: heData.result?.name || main.name,
      es: esData.result?.name || main.name,
      en: enData.result?.name || main.name,
      ru: ruData.result?.name || main.name,
    },
    description_he: main.editorial_summary?.overview ?? null,
    phone: main.formatted_phone_number ?? null,
    website: main.website ?? null,
    google_url: main.url ?? null,
    wheelchair_accessible: main.wheelchair_accessible_entrance ?? null,
    opening_hours_text: main.opening_hours?.weekday_text ?? [],
    photo_references: (main.photos ?? []).slice(0, 3).map((p) => p.photo_reference),
  }
}

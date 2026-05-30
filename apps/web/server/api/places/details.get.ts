import { defineEventHandler, getQuery, createError } from 'h3'
import { logError, logInfo } from '../../utils/logger'

interface GooglePlaceDetailsResult {
  name: string
  editorial_summary?: { overview: string }
  formatted_phone_number?: string
  website?: string
  opening_hours?: {
    weekday_text: string[]
    periods: unknown[]
  }
  photos?: { photo_reference: string }[]
  wheelchair_accessible_entrance?: boolean
  url?: string
}

interface GooglePlaceDetailsResponse {
  status: string
  result?: GooglePlaceDetailsResult
}

interface GooglePlaceNameResponse {
  status: string
  result?: { name: string }
}

const VALID_LANGS = new Set(['es', 'en', 'he', 'ru'])

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const placeId = query.place_id
  const rawLang = typeof query.lang === 'string' ? query.lang : ''
  const lang = VALID_LANGS.has(rawLang) ? rawLang : 'he'

  if (!placeId || typeof placeId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'place_id es requerido' })
  }

  const key = config.googlePlacesApiKey as string
  if (!key) {
    throw createError({ statusCode: 500, statusMessage: 'API key no configurada' })
  }

  await logInfo(event, 'places/details', 'Fetching place details', { place_id: placeId, lang })

  const mainUrl = [
    'https://maps.googleapis.com/maps/api/place/details/json',
    `?place_id=${encodeURIComponent(placeId)}`,
    `&language=${lang}`,
    `&fields=name,editorial_summary,formatted_phone_number,website,opening_hours,photos,wheelchair_accessible_entrance,url`,
    `&key=${key}`,
  ].join('')

  const makeNameUrl = (l: string) =>
    [
      'https://maps.googleapis.com/maps/api/place/details/json',
      `?place_id=${encodeURIComponent(placeId)}`,
      `&language=${l}`,
      `&fields=name`,
      `&key=${key}`,
    ].join('')

  let mainData: GooglePlaceDetailsResponse
  let heData: GooglePlaceNameResponse
  let esData: GooglePlaceNameResponse
  let enData: GooglePlaceNameResponse
  let ruData: GooglePlaceNameResponse

  try {
    ;[mainData, heData, esData, enData, ruData] = await Promise.all([
      fetch(mainUrl).then((r) => r.json()) as Promise<GooglePlaceDetailsResponse>,
      fetch(makeNameUrl('he')).then((r) => r.json()) as Promise<GooglePlaceNameResponse>,
      fetch(makeNameUrl('es')).then((r) => r.json()) as Promise<GooglePlaceNameResponse>,
      fetch(makeNameUrl('en')).then((r) => r.json()) as Promise<GooglePlaceNameResponse>,
      fetch(makeNameUrl('ru')).then((r) => r.json()) as Promise<GooglePlaceNameResponse>,
    ])
  } catch (err) {
    await logError(event, 'places/details', 'Error conectando con Google Places', {
      error: String(err),
    })
    throw createError({ statusCode: 502, statusMessage: 'Error conectando con Google Places' })
  }

  if (mainData.status !== 'OK' || !mainData.result) {
    await logError(event, 'places/details', 'Google Places returned no result', {
      status: mainData.status,
      place_id: placeId,
    })
    throw createError({ statusCode: 404, statusMessage: 'Lugar no encontrado' })
  }

  const main = mainData.result

  const name_i18n: Record<string, string> = {
    he: heData.result?.name ?? main.name,
    es: esData.result?.name ?? main.name,
    en: enData.result?.name ?? main.name,
    ru: ruData.result?.name ?? main.name,
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
})

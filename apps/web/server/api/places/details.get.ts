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

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const placeId = query.place_id

  if (!placeId || typeof placeId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'place_id es requerido' })
  }

  const key = config.googlePlacesApiKey as string
  if (!key) {
    throw createError({ statusCode: 500, statusMessage: 'API key no configurada' })
  }

  await logInfo(event, 'places/details', 'Fetching place details', { place_id: placeId })

  const heUrl = [
    'https://maps.googleapis.com/maps/api/place/details/json',
    `?place_id=${encodeURIComponent(placeId)}`,
    `&language=he`,
    `&fields=name,editorial_summary,formatted_phone_number,website,opening_hours,photos,wheelchair_accessible_entrance,url`,
    `&key=${key}`,
  ].join('')

  const makeNameUrl = (lang: string) =>
    [
      'https://maps.googleapis.com/maps/api/place/details/json',
      `?place_id=${encodeURIComponent(placeId)}`,
      `&language=${lang}`,
      `&fields=name`,
      `&key=${key}`,
    ].join('')

  let heData: GooglePlaceDetailsResponse
  let esData: GooglePlaceNameResponse
  let enData: GooglePlaceNameResponse
  let ruData: GooglePlaceNameResponse

  try {
    ;[heData, esData, enData, ruData] = await Promise.all([
      fetch(heUrl).then((r) => r.json()) as Promise<GooglePlaceDetailsResponse>,
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

  if (heData.status !== 'OK' || !heData.result) {
    await logError(event, 'places/details', 'Google Places returned no result', {
      status: heData.status,
      place_id: placeId,
    })
    throw createError({ statusCode: 404, statusMessage: 'Lugar no encontrado' })
  }

  const he = heData.result
  const heName = he.name

  const name_i18n: Record<string, string> = {
    he: heName,
    es: esData.result?.name ?? heName,
    en: enData.result?.name ?? heName,
    ru: ruData.result?.name ?? heName,
  }

  const description_i18n: Record<string, string> = {}
  if (he.editorial_summary?.overview) {
    description_i18n.he = he.editorial_summary.overview
  }

  const photos = (he.photos ?? [])
    .slice(0, 5)
    .map((p) => `/api/places/photo?ref=${encodeURIComponent(p.photo_reference)}`)

  return {
    name_i18n,
    description_i18n,
    phone: he.formatted_phone_number ?? null,
    website: he.website ?? null,
    google_url: he.url ?? null,
    wheelchair_accessible: he.wheelchair_accessible_entrance ?? null,
    opening_hours: he.opening_hours
      ? { weekday_text: he.opening_hours.weekday_text, periods: he.opening_hours.periods }
      : null,
    photos,
  }
})

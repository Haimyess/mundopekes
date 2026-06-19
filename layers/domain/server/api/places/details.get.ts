import { defineEventHandler, getQuery, createError } from 'h3'
import {
  resolveSearchLang,
  buildDetailsUrl,
  buildNameUrl,
  mapDetailsResponse,
} from '../../utils/places-logic'

interface GooglePlaceDetailsResponse {
  status: string
  result?: import('../../utils/places-logic').RawGoogleDetailsResult
}

interface GooglePlaceNameResponse {
  status: string
  result?: { name: string }
}

const RATE_LIMIT = 20
const RATE_WINDOW_SECONDS = 60

export default defineEventHandler(async (event) => {
  await checkRateLimit(event, 'places/details', {
    limit: RATE_LIMIT,
    windowSeconds: RATE_WINDOW_SECONDS,
  })

  const config = useRuntimeConfig()
  const query = getQuery(event)
  const placeId = query.place_id
  const rawLang = typeof query.lang === 'string' ? query.lang : ''
  const lang = resolveSearchLang(rawLang)

  if (!placeId || typeof placeId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'place_id es requerido' })
  }

  const key = config.googlePlacesApiKey as string
  if (!key) {
    throw createError({ statusCode: 500, statusMessage: 'API key no configurada' })
  }

  await logInfo(event, 'places/details', 'Fetching place details', { place_id: placeId, lang })

  const mainUrl = buildDetailsUrl(placeId, lang, key)

  let mainData: GooglePlaceDetailsResponse
  let heData: GooglePlaceNameResponse
  let esData: GooglePlaceNameResponse
  let enData: GooglePlaceNameResponse
  let ruData: GooglePlaceNameResponse

  try {
    ;[mainData, heData, esData, enData, ruData] = await Promise.all([
      fetch(mainUrl).then((r) => r.json()) as Promise<GooglePlaceDetailsResponse>,
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

  return mapDetailsResponse(
    mainData.result,
    heData.result?.name ?? '',
    esData.result?.name ?? '',
    enData.result?.name ?? '',
    ruData.result?.name ?? '',
    lang
  )
})

// server/api/places/search.get.ts
import { defineEventHandler, getQuery, createError } from 'h3'
import { logError, logInfo } from '../../utils/logger'
import { resolveSearchLang, buildSearchUrl, mapSearchResult } from '../../utils/places-logic'

interface GoogleTextSearchResponse {
  status: string
  results: import('../../utils/places-logic').RawGooglePlace[]
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const q = query.q
  const rawLang = typeof query.lang === 'string' ? query.lang : ''
  const lang = resolveSearchLang(rawLang)

  if (!q || typeof q !== 'string' || q.trim().length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'Query mínimo 3 caracteres' })
  }

  const key = config.googlePlacesApiKey as string
  if (!key) {
    throw createError({ statusCode: 500, statusMessage: 'API key no configurada' })
  }

  await logInfo(event, 'places/search', 'Searching places', { q, lang })

  const searchUrl = buildSearchUrl(q as string, lang, key)

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
  const places = results.map((place) => mapSearchResult(place, lang))

  return { places }
})

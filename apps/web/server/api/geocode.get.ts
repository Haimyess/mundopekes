// server/api/geocode.get.ts
// Geocoding via Nominatim (OpenStreetMap) — sin API key
// Uso: /api/geocode?address=Hermon, Israel
// Límite: 1 req/seg — suficiente para formularios

import { logError, logInfo } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const address = query.address as string

  if (!address?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Address is required' })
  }

  await logInfo(event, 'geocode', 'Geocoding address', { address })

  const encoded = encodeURIComponent(address.trim())
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=il`

  try {
    const results = await $fetch<
      Array<{
        lat: string
        lon: string
        display_name: string
      }>
    >(url, {
      headers: {
        // Nominatim requiere un User-Agent identificable
        'User-Agent': 'MundoPekes/1.0 (contact@mundopekes.com)',
      },
    })

    if (!results?.length) {
      throw createError({ statusCode: 404, statusMessage: 'Address not found' })
    }

    const { lat, lon, display_name } = results[0]!

    return {
      lat: Number.parseFloat(lat),
      lng: Number.parseFloat(lon),
      display_name,
    }
  } catch (err) {
    await logError(event, 'geocode', 'Geocoding failed', { address, error: String(err) })
    throw err
  }
})

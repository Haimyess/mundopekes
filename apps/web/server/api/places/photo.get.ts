// server/api/places/photo.get.ts
import { defineEventHandler, getQuery, createError, setHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const ref = query.ref

  if (!ref || typeof ref !== 'string' || ref.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'photo_reference requerida' })
  }

  const key = config.googlePlacesApiKey as string
  if (!key) {
    throw createError({ statusCode: 500, statusMessage: 'API key no configurada' })
  }

  const url = [
    'https://maps.googleapis.com/maps/api/place/photo',
    `?maxwidth=400`,
    `&photo_reference=${encodeURIComponent(ref.trim())}`,
    `&key=${key}`,
  ].join('')

  let res: Response

  try {
    res = await fetch(url, { redirect: 'follow' })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Error conectando con Google Photos' })
  }

  if (!res.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `Google Photos error: ${res.status} ${res.statusText}`,
    })
  }

  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const buffer = await res.arrayBuffer()

  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Cache-Control', 'public, max-age=86400')

  return new Uint8Array(buffer)
})
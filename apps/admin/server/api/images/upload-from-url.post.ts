import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

const BUCKET = 'place-images'

/**
 * POST /api/images/upload-from-url
 * Body: { url: string }  — a Google photo proxy URL (/api/places/photo?ref=…)
 * Returns: { url: string } — permanent Supabase Storage public URL
 *
 * Downloads the photo from Google and stores it in Supabase Storage so
 * the URL doesn't expire (Google Places photo refs have a limited lifetime).
 */
export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const { url } = await readBody<{ url: string }>(event)

  if (!url || !url.startsWith('/api/places/photo?ref=')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'URL inválida — debe ser una URL proxy de Google Photos',
    })
  }

  const ref = decodeURIComponent(new URL(url, 'http://x').searchParams.get('ref') ?? '')
  if (!ref) throw createError({ statusCode: 400, statusMessage: 'ref faltante en la URL' })

  // Download from Google Places Photo API
  const config = useRuntimeConfig()
  const googleUrl = [
    'https://maps.googleapis.com/maps/api/place/photo',
    `?maxwidth=1200`,
    `&photo_reference=${encodeURIComponent(ref)}`,
    `&key=${config.googlePlacesApiKey}`,
  ].join('')

  const imgRes = await fetch(googleUrl, { redirect: 'follow' })
  if (!imgRes.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Error descargando imagen de Google Places',
    })
  }

  const buffer = await imgRes.arrayBuffer()
  const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
  const ext = contentType.split('/')[1]?.split(';')[0] ?? 'jpg'
  const filename = `places/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  const supabase = serverSupabaseServiceRole<Database>(event)

  // Ensure bucket exists (creates it on first run; ignores conflict if already present)
  const { error: bucketError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  })
  if (bucketError && !bucketError.message.includes('already exists')) {
    throw createError({
      statusCode: 500,
      statusMessage: `Error creando bucket: ${bucketError.message}`,
    })
  }

  // Upload
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType, upsert: false })

  if (uploadError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Error subiendo imagen: ${uploadError.message}`,
    })
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(filename)

  return { url: publicUrl }
})

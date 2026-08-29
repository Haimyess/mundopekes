import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'place-images'

/**
 * Downloads a Google Places photo (identified by its proxy URL,
 * /api/places/photo?ref=…) and re-uploads it to Supabase Storage so the URL
 * doesn't expire (Google Places photo refs have a limited lifetime).
 * Returns the permanent public Storage URL.
 *
 * Extracted from the old inline body of POST /api/images/upload-from-url so
 * server-side flows (suggestion approve/merge) can call it directly instead
 * of the client having to hit that endpoint once per photo — see
 * resolve-suggestion-images.ts.
 */
export async function uploadImageFromUrl(
  supabase: SupabaseClient,
  url: string,
  googlePlacesApiKey: string | undefined
): Promise<string> {
  if (!url.startsWith('/api/places/photo?ref=')) {
    throw new Error('URL inválida — debe ser una URL proxy de Google Photos')
  }

  const ref = decodeURIComponent(new URL(url, 'http://x').searchParams.get('ref') ?? '')
  if (!ref) throw new Error('ref faltante en la URL')

  const googleUrl = [
    'https://maps.googleapis.com/maps/api/place/photo',
    `?maxwidth=1200`,
    `&photo_reference=${encodeURIComponent(ref)}`,
    `&key=${googlePlacesApiKey}`,
  ].join('')

  const imgRes = await fetch(googleUrl, { redirect: 'follow' })
  if (!imgRes.ok) {
    throw new Error('Error descargando imagen de Google Places')
  }

  const buffer = await imgRes.arrayBuffer()
  const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
  const ext = contentType.split('/')[1]?.split(';')[0] ?? 'jpg'
  const filename = `places/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  // Ensure bucket exists (creates it on first run; ignores conflict if already present)
  const { error: bucketError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  })
  if (bucketError && !bucketError.message.includes('already exists')) {
    throw new Error(`Error creando bucket: ${bucketError.message}`)
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType, upsert: false })

  if (uploadError) {
    throw new Error(`Error subiendo imagen: ${uploadError.message}`)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(filename)

  return publicUrl
}

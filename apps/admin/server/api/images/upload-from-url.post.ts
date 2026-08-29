import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { uploadImageFromUrl } from '../../utils/upload-image-from-url'

/**
 * POST /api/images/upload-from-url
 * Body: { url: string }  — a Google photo proxy URL (/api/places/photo?ref=…)
 * Returns: { url: string } — permanent Supabase Storage public URL
 */
export default defineEventHandler(async (event) => {
  const { url } = await readBody<{ url: string }>(event)
  if (!url) throw createError({ statusCode: 400, statusMessage: 'URL requerida' })

  const supabase = serverSupabaseServiceRole<Database>(event)
  const config = useRuntimeConfig(event)

  try {
    const publicUrl = await uploadImageFromUrl(supabase, url, config.googlePlacesApiKey)
    return { url: publicUrl }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    const statusCode =
      message.includes('inválida') || message.includes('faltante')
        ? 400
        : message.includes('descargando')
          ? 502
          : 500
    throw createError({ statusCode, statusMessage: message })
  }
})

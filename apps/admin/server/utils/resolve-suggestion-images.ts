import type { SupabaseClient } from '@supabase/supabase-js'
import { uploadImageFromUrl } from './upload-image-from-url'

const MAX_PROMOTED_IMAGES = 5

/**
 * Suggestions rarely carry real images — `suggestion.images` is only
 * populated if an admin manually opened edit mode and let the ImageUploader
 * auto-add Google photos (or added them by hand). The actual photos usually
 * sit in `metadata.photos`, ephemeral Google Places proxy URLs. Approving or
 * merging without promoting them first used to silently produce a place/
 * activity with zero images unless that client-side side effect happened to
 * have already run. This runs unconditionally on every approve/merge instead
 * — no longer depends on whether an admin opened the edit drawer first.
 *
 * Capped at MAX_PROMOTED_IMAGES to keep approval latency and storage usage
 * bounded — an admin can still add more manually afterward via Edit.
 */
export async function resolveSuggestionImages(
  supabase: SupabaseClient,
  suggestion: { images: string[] | null; metadata: unknown },
  googlePlacesApiKey: string | undefined
): Promise<string[]> {
  const existing = (suggestion.images ?? []).filter((u): u is string => !!u)
  if (existing.length > 0) return existing

  const photos = ((suggestion.metadata as { photos?: string[] } | null)?.photos ?? []).slice(
    0,
    MAX_PROMOTED_IMAGES
  )
  if (photos.length === 0) return []

  const uploaded = await Promise.all(
    photos.map(async (url) => {
      try {
        return await uploadImageFromUrl(supabase, url, googlePlacesApiKey)
      } catch (err) {
        console.error(`Failed to promote suggestion image ${url}:`, err)
        return null
      }
    })
  )
  return uploaded.filter((u): u is string => !!u)
}

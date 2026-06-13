/**
 * Composable for uploading images from a Google proxy URL to Supabase Storage.
 * Returns a permanent public URL instead of an ephemeral Google photo proxy URL.
 */
export function useImageUpload() {
  const uploadFromUrl = async (proxyUrl: string): Promise<string> => {
    const { url } = await $fetch<{ url: string }>('/api/images/upload-from-url', {
      method: 'POST',
      body: { url: proxyUrl },
    })
    return url
  }

  return { uploadFromUrl }
}

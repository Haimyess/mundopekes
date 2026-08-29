/**
 * Reads the DeepL API key from Nitro runtime config.
 * Extracted as an explicit import so it can be mocked in vitest tests
 * without pulling in nuxt/app (which would trigger the Nitro impound error).
 */
export function getDeeplApiKey(event: unknown): string | undefined {
  return (
    useRuntimeConfig(event as Parameters<typeof useRuntimeConfig>[0]) as Record<string, unknown>
  ).deeplApiKey as string | undefined
}

/**
 * Same pattern as getDeeplApiKey — used by suggestion approve/merge to
 * promote Google Places photos into permanent Storage images (see
 * resolve-suggestion-images.ts).
 */
export function getGooglePlacesApiKey(event: unknown): string | undefined {
  return (
    useRuntimeConfig(event as Parameters<typeof useRuntimeConfig>[0]) as Record<string, unknown>
  ).googlePlacesApiKey as string | undefined
}

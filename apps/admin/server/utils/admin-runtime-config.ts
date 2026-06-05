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

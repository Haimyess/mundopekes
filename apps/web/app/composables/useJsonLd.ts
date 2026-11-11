type JsonLd = Record<string, unknown>

export function useJsonLd(key: string, build: () => JsonLd | null) {
  useHead(() => {
    const data = build()
    if (!data) return {}
    return {
      script: [
        {
          key: `jsonld-${key}`,
          type: 'application/ld+json',
          innerHTML: serializeJsonLd(data),
        },
      ],
    }
  })
}

export function useSiteUrl() {
  const baseUrl = useRuntimeConfig().public.i18n.baseUrl as string
  const requestUrl = useRequestURL()
  const localePath = useLocalePath()
  const origin = computed(() => baseUrl || requestUrl.origin)
  const absoluteLocaleUrl = (path: string) => absoluteUrl(origin.value, localePath(path))
  return { origin, absoluteLocaleUrl }
}

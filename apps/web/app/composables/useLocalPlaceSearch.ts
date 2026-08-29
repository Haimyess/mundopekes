// Searches MundoPekes' OWN `places` table (server route `/api/places/local-search`),
// as opposed to `usePlacesSearch.ts` which proxies Google Places. This is the
// primary lookup in the suggestion wizard's place step — finding a match here
// means the user attaches their suggestion to an existing place instead of
// proposing a new one.
export interface LocalPlaceMatch {
  id: string
  name_i18n: Record<string, string>
  lat: number | null
  lng: number | null
  thumbnail: string | null
  google_place_id: string | null
  city: { id: number; name: string } | null
}

export function useLocalPlaceSearch() {
  const results = ref<LocalPlaceMatch[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout>

  const search = (query: string) => {
    clearTimeout(debounceTimer)
    results.value = []
    error.value = null

    if (query.trim().length < 2) return

    debounceTimer = setTimeout(async () => {
      loading.value = true
      try {
        const data = await $fetch<{ places: LocalPlaceMatch[] }>(
          `/api/places/local-search?q=${encodeURIComponent(query)}`
        )
        results.value = data.places
      } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : 'Error al buscar'
      } finally {
        loading.value = false
      }
    }, 400)
  }

  const clear = () => {
    results.value = []
    error.value = null
    loading.value = false
    clearTimeout(debounceTimer)
  }

  return { results, loading, error, search, clear }
}

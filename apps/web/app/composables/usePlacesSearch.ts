export interface PlaceSearchResult {
  google_place_id: string
  name: string
  address: string
  lat: number | null
  lng: number | null
  photo_url: string | null
  types: string[]
  suggested_categories: { id: string; name: string }[]
}

export function usePlacesSearch() {
  const results = ref<PlaceSearchResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout>

  const search = (query: string) => {
    clearTimeout(debounceTimer)
    results.value = []
    error.value = null

    if (query.trim().length < 3) return

    debounceTimer = setTimeout(async () => {
      loading.value = true
      try {
        const data = await $fetch<{ places: PlaceSearchResult[] }>(
          `/api/places/search?q=${encodeURIComponent(query)}`
        )
        results.value = data.places
      } catch (e: any) {
        error.value = e?.message ?? 'Error al buscar'
      } finally {
        loading.value = false
      }
    }, 600)
  }

  const clear = () => {
    results.value = []
    error.value = null
    loading.value = false
    clearTimeout(debounceTimer)
  }

  return { results, loading, error, search, clear }
}
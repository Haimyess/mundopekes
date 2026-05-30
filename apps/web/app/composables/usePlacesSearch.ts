export interface PlaceSearchResult {
  google_place_id: string
  name: string
  name_i18n: Record<string, string>
  address: string
  lat: number | null
  lng: number | null
  photo_url: string | null
  photo_ref: string | null
  types: string[]
  suggested_categories: { id: string; name: string }[]
}

export interface PlaceDetails {
  name_i18n: Record<string, string>
  description_i18n: Record<string, string>
  phone: string | null
  website: string | null
  google_url: string | null
  wheelchair_accessible: boolean | null
  opening_hours: { weekday_text?: string[]; periods?: unknown[] } | null
  photos: string[]
}

export function usePlacesSearch() {
  const { locale } = useI18n()

  const results = ref<PlaceSearchResult[]>([])
  const loading = ref(false)
  const loadingDetails = ref(false)
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
          `/api/places/search?q=${encodeURIComponent(query)}&lang=${locale.value}`
        )
        results.value = data.places
      } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : 'Error al buscar'
      } finally {
        loading.value = false
      }
    }, 600)
  }

  const fetchDetails = async (placeId: string): Promise<PlaceDetails | null> => {
    loadingDetails.value = true
    try {
      const data = await $fetch<PlaceDetails>(
        `/api/places/details?place_id=${encodeURIComponent(placeId)}&lang=${locale.value}`
      )
      return data
    } catch {
      return null
    } finally {
      loadingDetails.value = false
    }
  }

  const clear = () => {
    results.value = []
    error.value = null
    loading.value = false
    clearTimeout(debounceTimer)
  }

  return { results, loading, loadingDetails, error, search, fetchDetails, clear }
}

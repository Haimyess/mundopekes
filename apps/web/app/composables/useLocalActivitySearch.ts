// Searches MundoPekes' OWN `activities` table, scoped to a place (server
// route `/api/activities/local-search`) — mirrors `useLocalPlaceSearch.ts`.
// Used by the suggestion wizard's activity step so picking an activity that
// already exists at the selected place reuses it instead of proposing a
// duplicate.
export interface LocalActivityMatch {
  id: string
  title_i18n: Record<string, string>
  category_id: string | null
}

export function useLocalActivitySearch(placeId: string) {
  const results = ref<LocalActivityMatch[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout>

  const search = (query: string) => {
    clearTimeout(debounceTimer)
    results.value = []
    error.value = null

    if (!placeId || query.trim().length < 2) return

    debounceTimer = setTimeout(async () => {
      loading.value = true
      try {
        const data = await $fetch<{ activities: LocalActivityMatch[] }>(
          `/api/activities/local-search?q=${encodeURIComponent(query)}&place_id=${encodeURIComponent(placeId)}`
        )
        results.value = data.activities
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

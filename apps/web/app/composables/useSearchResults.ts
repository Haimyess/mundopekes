import type { SearchResponse } from '#shared/types/search'

export const SEARCH_RESULTS_KEY = 'search-results'

export async function useSearchResults() {
  const { state } = useSearchState()
  const query = computed(() => toSearchQuery(state.value))

  const { data, status, error, refresh } = await useFetch<SearchResponse>('/api/search', {
    key: SEARCH_RESULTS_KEY,
    query,
  })

  return {
    state,
    response: data,
    isLoading: computed(() => status.value === 'pending'),
    hasError: computed(() => !!error.value),
    refresh,
  }
}

import { computed, ref } from 'vue'
import type { SearchState } from '~/app/utils/search-query'
import { patchSearchState, toSearchQuery } from '~/app/utils/search-query'

export const searchState = ref<SearchState>({})

export function searchLink(patch: Partial<SearchState>): string {
  const query = new URLSearchParams(toSearchQuery(patchSearchState(searchState.value, patch)))
  const serialized = query.toString()
  return serialized ? `/search?${decodeURIComponent(serialized)}` : '/search'
}

export const searchStateModule = {
  useSearchState: () => ({
    state: computed(() => searchState.value),
    isSearchPage: computed(() => true),
    linkTo: searchLink,
  }),
}

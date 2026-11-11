import type { LocationQueryRaw } from 'vue-router'
import type { SearchState } from '~/utils/search-query'

export const SEARCH_ROUTE_NAME = 'search'

export function useSearchLink() {
  const localePath = useLocalePath()
  const getRouteBaseName = useRouteBaseName()
  const route = useRoute()

  const searchLink = (query: LocationQueryRaw = {}) => localePath({ path: SEARCH_PATH, query })
  const searchLinkFor = (state: SearchState) => localePath(toSearchLocation(state))
  const isOnSearchPage = computed(() => getRouteBaseName(route) === SEARCH_ROUTE_NAME)

  return { searchLink, searchLinkFor, isOnSearchPage }
}

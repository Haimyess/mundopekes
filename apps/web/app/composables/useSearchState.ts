import type { SearchState } from '~/utils/search-query'

export function useSearchState() {
  const route = useRoute()
  const router = useRouter()
  const isSearchPage = computed(() => route.path === SEARCH_PATH)
  const state = computed<SearchState>(() =>
    isSearchPage.value ? parseSearchQuery(route.query) : {}
  )

  function linkTo(patch: Partial<SearchState>): string {
    return router.resolve(toSearchLocation(patchSearchState(state.value, patch))).fullPath
  }

  return { state, isSearchPage, linkTo }
}

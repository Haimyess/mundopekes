import type { InjectionKey, Ref } from 'vue'
import type { SearchState } from '~/utils/search-query'

export interface SearchDraft {
  state: Ref<SearchState>
  update: (patch: Partial<SearchState>) => void
}

const SEARCH_DRAFT_KEY: InjectionKey<SearchDraft> = Symbol('search-draft')

export function provideSearchDraft(initial: SearchState = {}): SearchDraft {
  const state = ref<SearchState>(initial)
  const draft: SearchDraft = {
    state,
    update: (patch) => {
      state.value = patchSearchState(state.value, patch)
    },
  }
  provide(SEARCH_DRAFT_KEY, draft)
  return draft
}

export function useSearchState() {
  const route = useRoute()
  const { searchLinkFor, isOnSearchPage } = useSearchLink()
  const draft = inject(SEARCH_DRAFT_KEY, null)
  const isSearchPage = computed(() => !draft && isOnSearchPage.value)
  const state = computed<SearchState>(() => {
    if (draft) return draft.state.value
    return isSearchPage.value ? parseSearchQuery(route.query) : {}
  })

  function linkTo(patch: Partial<SearchState>): string {
    return searchLinkFor(patchSearchState(state.value, patch))
  }

  return { state, isSearchPage, linkTo, draft }
}

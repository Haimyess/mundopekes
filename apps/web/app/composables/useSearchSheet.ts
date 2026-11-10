import type { Ref } from 'vue'
import type { SearchState } from '~/utils/search-query'

export function useSearchSheet<T>(isOpen: Ref<boolean>, select: (state: SearchState) => T) {
  const { state, linkTo } = useSearchState()
  const draft = ref(select(state.value)) as Ref<T>

  watch(isOpen, (open) => {
    if (open) draft.value = select(state.value)
  })

  async function apply(patch: Partial<SearchState>) {
    isOpen.value = false
    await navigateTo(linkTo(patch))
  }

  return { state, draft, apply }
}

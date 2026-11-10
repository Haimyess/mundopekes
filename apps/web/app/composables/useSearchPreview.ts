import { useDebounceFn } from '@vueuse/core'
import type { Ref } from 'vue'
import type { SearchResponse } from '#shared/types/search'
import type { SearchState } from '~/utils/search-query'

const PREVIEW_DEBOUNCE_MS = 250

export function useSearchPreview(isOpen: Ref<boolean>, draftState: Ref<SearchState>) {
  const preview = ref<Pick<SearchResponse, 'total' | 'facets'> | null>(null)
  const isLoading = ref(false)
  let requestId = 0

  const load = useDebounceFn(async () => {
    const currentRequest = ++requestId
    isLoading.value = true
    try {
      const response = await $fetch<SearchResponse>('/api/search', {
        query: toSearchQuery({ ...draftState.value, page: undefined }),
      })
      if (currentRequest === requestId) preview.value = response
    } catch {
      if (currentRequest === requestId) preview.value = null
    } finally {
      if (currentRequest === requestId) isLoading.value = false
    }
  }, PREVIEW_DEBOUNCE_MS)

  watch(
    [isOpen, draftState],
    ([open]) => {
      if (open) void load()
    },
    { deep: true }
  )

  return { preview, isLoading }
}

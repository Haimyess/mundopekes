// app/composables/useUrlPage.ts
// Keeps a page number (and optionally other query filters) synced with the
// URL, so pagination survives a refresh/back-button and is shareable/bookmarkable.
// router.replace (not push) — paging through results shouldn't spam browser history.
export const useUrlPage = (paramName = 'page') => {
  const route = useRoute()
  const router = useRouter()

  const page = computed<number>({
    get: () => {
      const raw = Number(route.query[paramName])
      return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
    },
    set: (value: number) => {
      const { [paramName]: _omit, ...rest } = route.query
      const query = value <= 1 ? rest : { ...rest, [paramName]: String(value) }
      router.replace({ query })
    },
  })

  return { page }
}

// Two-way binds an existing `page` ref (as returned by the list composables —
// useActivities/useProviders/useContactRequests/useLogs/useSuggestions) to the
// URL, without changing those composables' internals. Call once per page,
// right after destructuring `page` from the list composable.
export const syncUrlPage = (pageRef: Ref<number>, paramName = 'page') => {
  const { page: urlPage } = useUrlPage(paramName)

  if (pageRef.value !== urlPage.value) pageRef.value = urlPage.value

  watch(urlPage, (value) => {
    if (pageRef.value !== value) pageRef.value = value
  })
  watch(pageRef, (value) => {
    if (urlPage.value !== value) urlPage.value = value
  })
}

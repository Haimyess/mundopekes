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

// Same idea as syncUrlPage but for an arbitrary string filter (status,
// category, city, ...). `emptyValue` (e.g. 'all') is treated as "no filter"
// and omitted from the URL so the query string stays clean in the common case.
export const syncUrlParam = (valueRef: Ref<string>, paramName: string, emptyValue = 'all') => {
  const route = useRoute()
  const router = useRouter()

  const urlValue = computed<string>({
    get: () => {
      const raw = route.query[paramName]
      return typeof raw === 'string' && raw ? raw : emptyValue
    },
    set: (value: string) => {
      const { [paramName]: _omit, ...rest } = route.query
      const query = value === emptyValue ? rest : { ...rest, [paramName]: value }
      router.replace({ query })
    },
  })

  // Solo adoptamos el valor de la URL al montar si el query param ya estaba
  // presente (deep-link / refresh) — si no, dejamos el default del composable
  // (p.ej. status=pending en Sugerencias) en vez de pisarlo con emptyValue.
  if (typeof route.query[paramName] === 'string' && valueRef.value !== urlValue.value) {
    valueRef.value = urlValue.value
  }

  watch(urlValue, (value) => {
    if (valueRef.value !== value) valueRef.value = value
  })
  watch(valueRef, (value) => {
    if (urlValue.value !== value) urlValue.value = value
  })
}

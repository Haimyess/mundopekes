// app/composables/useFacets.ts
// Generic faceted-filter counter, shared by Suggestions/Places/Activities.
// Loads a lightweight, unfiltered row projection from a `facets` endpoint
// (just the filterable columns, not full records — the table itself stays
// server-paginated) and re-runs the filter predicate client-side per
// candidate option per dimension, holding the other dimensions fixed.
// Mirrors the pattern in apps/web/app/composables/useFilterCounts.ts.
//
// Uses useAsyncData (not a bare ref + $fetch) so the SSR-fetched rows are
// serialized into the Nuxt payload: without that, the client re-fetches
// from scratch during hydration and briefly renders different "(N)" counts
// than the server did, which Vue flags as a hydration mismatch.
//
// `dimensions` maps a row field name (e.g. 'city') to the Ref<string> that
// holds its currently selected filter value ('all' = no filter on that field).
export function useFacets<Row extends object>(
  endpoint: string,
  dimensions: Record<string, Ref<string>>
) {
  const {
    data: rows,
    status,
    execute,
  } = useAsyncData<Row[]>(`facets:${endpoint}`, () => $fetch<Row[]>(endpoint), {
    immediate: false,
    default: () => [] as Row[],
  })
  // useAsyncData no rechaza en error (queda en `error`, no en el catch del
  // llamador) — un facets endpoint caído solo pierde los "(N)"/grayed-out,
  // nunca tumba la página.
  const loaded = computed(() => status.value === 'success')

  const load = () => execute()

  const matches = (row: Row, dimension: string, candidate: string) => {
    const record = row as Record<string, unknown>
    for (const [field, filterRef] of Object.entries(dimensions)) {
      const value = field === dimension ? candidate : filterRef.value
      if (value === 'all') continue
      if (String(record[field] ?? '') !== value) return false
    }
    return true
  }

  const countFor = (dimension: string, value: string) =>
    (rows.value ?? []).filter((r) => matches(r, dimension, value)).length

  const isDisabled = (dimension: string, value: string) =>
    loaded.value && countFor(dimension, value) === 0 && dimensions[dimension]?.value !== value

  return { rows, loaded, load, countFor, isDisabled }
}

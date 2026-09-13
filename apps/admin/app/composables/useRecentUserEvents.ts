export interface RecentUserEvent {
  id: string
  event_type: string
  session_id: string | null
  locale: string | null
  payload: Record<string, unknown>
  created_at: string | null
}

export interface FilterOption {
  value: string
  label: string
  count: number
}

interface FilterOptionsResponse {
  terms?: FilterOption[]
  categories?: FilterOption[]
  activities?: FilterOption[]
  places?: FilterOption[]
}

export const useRecentUserEvents = () => {
  const events = ref<RecentUserEvent[]>([])
  const total = ref(0)
  const page = ref(1)
  const isLoading = ref(false)
  const eventType = ref<string>('all')

  // Filtro secundario, dependiente del tipo de evento elegido — solo uno de
  // estos tres aplica a la vez, según qué campo tenga sentido para el
  // event_type seleccionado (ver useUserEventsSecondaryFilter más abajo).
  const term = ref<string>('all')
  const category = ref<string>('all')
  const targetId = ref<string>('all')

  const filterOptions = ref<FilterOptionsResponse>({})
  const isLoadingFilterOptions = ref(false)

  const totalPages = computed(() => Math.ceil(total.value / 50))

  const fetch = async () => {
    isLoading.value = true
    try {
      const params: Record<string, string | number> = { page: page.value, limit: 50 }
      if (eventType.value !== 'all') params.eventType = eventType.value
      if (term.value !== 'all') params.term = term.value
      if (category.value !== 'all') params.category = category.value
      if (targetId.value !== 'all') params.targetId = targetId.value

      const result = await $fetch<{
        data: RecentUserEvent[]
        count: number
        page: number
        totalPages: number
      }>('/api/user-events/recent', { params })
      events.value = result.data
      total.value = result.count
    } finally {
      isLoading.value = false
    }
  }

  const fetchFilterOptions = async () => {
    if (!['search', 'activity_view', 'place_view', 'directions_click'].includes(eventType.value)) {
      filterOptions.value = {}
      return
    }
    isLoadingFilterOptions.value = true
    try {
      filterOptions.value = await $fetch<FilterOptionsResponse>('/api/user-events/filter-options', {
        params: { eventType: eventType.value },
      })
    } finally {
      isLoadingFilterOptions.value = false
    }
  }

  watch(eventType, () => {
    page.value = 1
    term.value = 'all'
    category.value = 'all'
    targetId.value = 'all'
    fetchFilterOptions()
    fetch()
  })

  watch([term, category, targetId], () => {
    page.value = 1
    fetch()
  })

  watch(page, fetch)

  return {
    events,
    total,
    page,
    totalPages,
    isLoading,
    eventType,
    term,
    category,
    targetId,
    filterOptions,
    isLoadingFilterOptions,
    fetch,
  }
}

import type { Range } from '~/types'

export const USER_EVENT_TYPES = [
  'page_view',
  'search',
  'activity_view',
  'place_view',
  'directions_click',
  'contact_send',
  'suggestion_submit',
  'provider_interest',
] as const

export type UserEventType = (typeof USER_EVENT_TYPES)[number]

export interface UserEventsSummary {
  range: { from: string; to: string }
  totalEvents: number
  eventsInRange: number
  distinctSessions: number
  eventsByType: { event_type: string; count: number }[]
  timeseries: { day: string; count: number }[]
  topSearches: { term: string; count: number }[]
  zeroResultSearches: { term: string; count: number }[]
  topCategories: { slug: string; name_i18n: Record<string, string> | null; count: number }[]
  topCities: { city_name: string; count: number }[]
  topAgeRanges: {
    id: string
    label_key: string | null
    min_months: number | null
    max_months: number | null
    count: number
  }[]
  topActivities: {
    activity_id: string
    title: string
    views: number
    contacts: number
    directions: number
    conversion_rate: number
  }[]
  topPlaces: {
    place_id: string
    title: string
    views: number
    directions: number
  }[]
  searchStats: { total: number; zeroResults: number }
}

const DEFAULT_RANGE_DAYS = 30

const toDateOnly = (date: Date) => date.toISOString().slice(0, 10)
const fromDateOnly = (value: string) => new Date(`${value}T00:00:00`)

export const useUserEvents = () => {
  const now = new Date()
  const defaultStart = new Date(now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000)

  const fromDate = ref(toDateOnly(defaultStart))
  const toDate = ref(toDateOnly(now))

  // Puente para reutilizar HomeDateRangePicker.vue (defineModel<Range>) tal
  // cual, sin tocarlo — fromDate/toDate son los que se sincronizan a la URL
  // porque syncUrlParam solo maneja strings simples.
  const range = computed<Range>({
    get: () => ({ start: fromDateOnly(fromDate.value), end: fromDateOnly(toDate.value) }),
    set: (value) => {
      fromDate.value = toDateOnly(value.start)
      toDate.value = toDateOnly(value.end)
    },
  })

  const summary = ref<UserEventsSummary | null>(null)
  const isLoading = ref(false)

  const fetch = async () => {
    isLoading.value = true
    try {
      const params: Record<string, string> = {
        from: fromDateOnly(fromDate.value).toISOString(),
        to: new Date(fromDateOnly(toDate.value).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      }

      summary.value = await $fetch<UserEventsSummary>('/api/user-events/summary', { params })
    } finally {
      isLoading.value = false
    }
  }

  watch([fromDate, toDate], fetch)

  return { summary, isLoading, range, fromDate, toDate, fetch }
}

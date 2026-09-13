import type { Range } from '~/types'
import type { UserEventsSummary } from './useUserEvents'

export interface CatalogSummary {
  totalActivities: number
  totalPlaces: number
  totalProviders: number
  totalSuggestions: number
  pendingSuggestions: number
  totalContactRequests: number
  pendingContactRequests: number
  recentFeedbacks: Array<{
    id: string
    name: string
    email: string
    message: string
    created_at: string
    status: string
  }>
}

export interface WeekdayPoint {
  label: string
  value: number
  isPeak: boolean
}

const DEFAULT_RANGE_DAYS = 30
const WEEKDAY_LABELS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const WEEKDAY_LABELS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const toDateOnly = (date: Date) => date.toISOString().slice(0, 10)
const fromDateOnly = (value: string) => new Date(`${value}T00:00:00`)

export const useHomeDashboard = () => {
  const { locale } = useI18n()

  const now = new Date()
  const defaultStart = new Date(now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000)
  const fromDate = ref(toDateOnly(defaultStart))
  const toDate = ref(toDateOnly(now))

  // Puente para reutilizar HomeDateRangePicker.vue tal cual, igual que
  // useUserEvents.ts.
  const range = computed<Range>({
    get: () => ({ start: fromDateOnly(fromDate.value), end: fromDateOnly(toDate.value) }),
    set: (value) => {
      fromDate.value = toDateOnly(value.start)
      toDate.value = toDateOnly(value.end)
    },
  })

  const catalog = ref<CatalogSummary | null>(null)
  const traffic = ref<UserEventsSummary | null>(null)
  const trafficPrevious = ref<UserEventsSummary | null>(null)
  const isLoading = ref(false)

  const fetchTraffic = async () => {
    const start = fromDateOnly(fromDate.value)
    const end = new Date(fromDateOnly(toDate.value).getTime() + 24 * 60 * 60 * 1000)
    const rangeMs = end.getTime() - start.getTime()
    const previousStart = new Date(start.getTime() - rangeMs)

    const [current, previous] = await Promise.all([
      $fetch<UserEventsSummary>('/api/user-events/summary', {
        params: { from: start.toISOString(), to: end.toISOString() },
      }),
      $fetch<UserEventsSummary>('/api/user-events/summary', {
        params: { from: previousStart.toISOString(), to: start.toISOString() },
      }),
    ])
    traffic.value = current
    trafficPrevious.value = previous
  }

  const fetch = async () => {
    isLoading.value = true
    try {
      await Promise.all([
        $fetch<CatalogSummary>('/api/analytics/summary').then((r) => (catalog.value = r)),
        fetchTraffic(),
      ])
    } finally {
      isLoading.value = false
    }
  }

  watch([fromDate, toDate], fetch)

  // % de cambio vs. el período previo de igual duración — null cuando no hay
  // base de comparación (evita mostrar "+Infinity%").
  const trend = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 1 : null
    return (current - previous) / previous
  }

  const searchSuccessRate = computed(() => {
    const stats = traffic.value?.searchStats
    if (!stats || stats.total === 0) return null
    return 1 - stats.zeroResults / stats.total
  })

  // Suma los conteos diarios de la serie temporal por día de la semana — todo
  // data real derivada de lo que ya trae /api/user-events/summary, sin pegarle
  // de nuevo a la base.
  const weekdayData = computed<WeekdayPoint[]>(() => {
    const labels = locale.value === 'en' ? WEEKDAY_LABELS_EN : WEEKDAY_LABELS_ES
    const totals = new Array(7).fill(0) as number[]
    for (const point of traffic.value?.timeseries ?? []) {
      const day = new Date(`${point.day}T00:00:00`).getDay()
      totals[day] = (totals[day] ?? 0) + point.count
    }
    const max = Math.max(...totals)
    return labels.map((label, i) => ({
      label,
      value: totals[i] ?? 0,
      isPeak: max > 0 && totals[i] === max,
    }))
  })

  const peakWeekday = computed(() => weekdayData.value.find((d) => d.isPeak) ?? null)

  return {
    range,
    fromDate,
    toDate,
    catalog,
    traffic,
    trafficPrevious,
    isLoading,
    fetch,
    trend,
    searchSuccessRate,
    weekdayData,
    peakWeekday,
  }
}

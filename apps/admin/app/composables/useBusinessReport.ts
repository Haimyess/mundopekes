import type { Range } from '~/types'

export type BusinessEntityType = 'place' | 'provider' | 'activity'

export interface BusinessReportOptions {
  places: Array<{
    id: string
    name_i18n: Record<string, string>
    city: { name: string } | null
    provider_id: string | null
  }>
  providers: Array<{ id: string; name: string }>
  activities: Array<{
    id: string
    title_i18n: Record<string, string>
    place: { name_i18n: Record<string, string>; city: { name: string } | null } | null
  }>
}

export interface BusinessReport {
  entity: {
    type: BusinessEntityType
    id: string
    name: string
    city: string | null
    categories: Array<{ slug: string; name_i18n: Record<string, string> }>
  }
  range: { from: string; to: string }
  report: {
    views: number
    directions: number
    contacts: number
    uniqueSessions: number
    searchingSessions: number
  }
  timeseries: Array<{ day: string; count: number }>
  marketContext: { categorySearches: number; citySearches: number }
}

const DEFAULT_RANGE_DAYS = 30
const toDateOnly = (date: Date) => date.toISOString().slice(0, 10)
const fromDateOnly = (value: string) => new Date(`${value}T00:00:00`)

export const useBusinessReport = () => {
  const now = new Date()
  const defaultStart = new Date(now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000)
  const fromDate = ref(toDateOnly(defaultStart))
  const toDate = ref(toDateOnly(now))

  const range = computed<Range>({
    get: () => ({ start: fromDateOnly(fromDate.value), end: fromDateOnly(toDate.value) }),
    set: (value) => {
      fromDate.value = toDateOnly(value.start)
      toDate.value = toDateOnly(value.end)
    },
  })

  const entityType = ref<BusinessEntityType>('place')
  const entityId = ref<string | null>(null)

  const options = ref<BusinessReportOptions | null>(null)
  const report = ref<BusinessReport | null>(null)
  const isLoading = ref(false)

  const loadOptions = async () => {
    options.value = await $fetch<BusinessReportOptions>('/api/business-report/options')
  }

  const loadReport = async () => {
    if (!entityId.value) {
      report.value = null
      return
    }
    isLoading.value = true
    try {
      report.value = await $fetch<BusinessReport>(
        `/api/business-report/${entityType.value}/${entityId.value}`,
        {
          params: {
            from: fromDateOnly(fromDate.value).toISOString(),
            to: new Date(fromDateOnly(toDate.value).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          },
        }
      )
    } finally {
      isLoading.value = false
    }
  }

  watch([entityType, entityId, fromDate, toDate], loadReport)

  return {
    range,
    fromDate,
    toDate,
    entityType,
    entityId,
    options,
    report,
    isLoading,
    loadOptions,
    loadReport,
  }
}

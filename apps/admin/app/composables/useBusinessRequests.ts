import type { BusinessRequestKind, BusinessRequestStatus } from '@mundopekes/schemas'
import type { Tables } from '@mundopekes/types'

export type BusinessRequestRow = Tables<'business_requests'>

export const BUSINESS_REQUESTS_PAGE_SIZE = 20

interface BusinessRequestPage {
  data: BusinessRequestRow[]
  count: number
  page: number
  totalPages: number
}

export const useBusinessRequests = () => {
  const { t } = useI18n()
  const toast = useToast()

  const requests = ref<BusinessRequestRow[]>([])
  const total = ref(0)
  const page = ref(1)
  const isLoading = ref(true)
  const isSaving = ref(false)
  const kind = ref<BusinessRequestKind | undefined>(undefined)
  const status = ref<BusinessRequestStatus | undefined>('pending')
  const hasLoadedOnce = ref(false)

  const totalPages = computed(() => Math.ceil(total.value / BUSINESS_REQUESTS_PAGE_SIZE))

  const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t('businessRequests.toast.unknownError')

  const fetch = async () => {
    isLoading.value = true
    try {
      const result = await $fetch<BusinessRequestPage>('/api/business-requests', {
        params: {
          page: page.value,
          limit: BUSINESS_REQUESTS_PAGE_SIZE,
          kind: kind.value,
          status: status.value,
        },
      })
      requests.value = result.data
      total.value = result.count
    } catch (error) {
      toast.add({
        title: t('businessRequests.toast.loadError'),
        description: errorMessage(error),
        color: 'error',
      })
    } finally {
      isLoading.value = false
      hasLoadedOnce.value = true
    }
  }

  const update = async (id: string, nextStatus: BusinessRequestStatus, notes?: string) => {
    isSaving.value = true
    try {
      const updated = await $fetch<BusinessRequestRow>(`/api/business-requests/${id}`, {
        method: 'PATCH',
        body: { status: nextStatus, notes },
      })
      toast.add({ title: t('businessRequests.toast.updated'), color: 'success' })
      await fetch()
      return updated
    } catch (error) {
      toast.add({
        title: t('businessRequests.toast.updateError'),
        description: errorMessage(error),
        color: 'error',
      })
      return null
    } finally {
      isSaving.value = false
    }
  }

  watch([kind, status], () => {
    if (!hasLoadedOnce.value) return
    if (page.value !== 1) page.value = 1
    else fetch()
  })

  watch(page, () => {
    if (hasLoadedOnce.value) fetch()
  })

  return { requests, total, page, totalPages, isLoading, isSaving, kind, status, fetch, update }
}

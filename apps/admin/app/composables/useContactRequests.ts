import type { Tables } from '~/types/database.types'

export type ContactRequest = Tables<'contact_requests'>

export interface FeedbackStats {
  total: number
  thisMonth: number
  pending: number
  resolved: number
  byMonth: { month: string; count: number }[]
}

export const useContactRequests = () => {
  const toast = useToast()

  const requests = ref<ContactRequest[]>([])
  const total = ref(0)
  const page = ref(1)
  // Arranca en true — ver el comentario equivalente en useSuggestions.ts.
  const isLoading = ref(true)
  const feedbackStats = ref<FeedbackStats | null>(null)

  const intent = ref<string | undefined>(undefined)
  const status = ref<string | undefined>('pending') // mantiene el default 'pending'

  const totalPages = computed(() => Math.ceil(total.value / 20))

  // Evita que los watchers de abajo disparen un fetch duplicado cuando la
  // URL trae la página no-default al montar — ver el comentario equivalente
  // en useSuggestions.ts.
  const hasLoadedOnce = ref(false)

  const fetch = async () => {
    isLoading.value = true
    try {
      const params: Record<string, string | number> = { page: page.value, limit: 20 }
      if (intent.value) params.intent = intent.value
      if (status.value) params.status = status.value

      const result = await $fetch<{
        data: ContactRequest[]
        count: number
        page: number
        totalPages: number
      }>('/api/contact-requests', { params })
      requests.value = result.data
      total.value = result.count
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      toast.add({ title: 'Error cargando consultas', description: msg, color: 'error' })
    } finally {
      isLoading.value = false
      hasLoadedOnce.value = true
    }
  }

  const fetchFeedbackStats = async () => {
    try {
      feedbackStats.value = await $fetch<FeedbackStats>('/api/contact-requests/feedback-stats')
    } catch {
      feedbackStats.value = null
    }
  }

  const updateStatus = async (id: string, newStatus: 'pending' | 'read' | 'resolved') => {
    try {
      await $fetch(`/api/contact-requests/${id}`, {
        method: 'PATCH',
        body: { status: newStatus },
      })
      toast.add({ title: 'Estado actualizado', color: 'success' })
      await fetch()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      toast.add({ title: 'Error al actualizar', description: msg, color: 'error' })
    }
  }

  watch([intent, status], () => {
    if (!hasLoadedOnce.value) return
    page.value = 1
    fetch()
  })

  watch(page, () => {
    if (!hasLoadedOnce.value) return
    fetch()
  })

  return {
    requests,
    total,
    page,
    totalPages,
    isLoading,
    feedbackStats,
    intent,
    status,
    fetch,
    fetchFeedbackStats,
    updateStatus,
  }
}

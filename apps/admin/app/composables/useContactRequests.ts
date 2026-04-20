import type { Tables } from '~/types/database.types'

export type ContactRequest = Tables<'contact_requests'>

export const useContactRequests = () => {
  const toast = useToast()

  const requests = ref<ContactRequest[]>([])
  const total = ref(0)
  const page = ref(1)
  const isLoading = ref(false)

  const intent = ref('')
  const status = ref('pending')

  const totalPages = computed(() => Math.ceil(total.value / 20))

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
    page.value = 1
    fetch()
  })

  watch(page, fetch)

  return {
    requests,
    total,
    page,
    totalPages,
    isLoading,
    intent,
    status,
    fetch,
    updateStatus,
  }
}

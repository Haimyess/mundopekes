// app/composables/useSuggestions.ts

export type SuggestionStatus = 'pending' | 'approved' | 'rejected'

export interface Suggestion {
  id: string
  name: string
  description?: string
  location: { city?: string, region?: string, address?: string }
  age_range: any
  type: string[]
  best_season: string[]
  stroller_friendly: boolean
  open_weekends: boolean
  is_free: boolean
  schedule?: string
  images: string[]
  status: SuggestionStatus
  rejection_reason?: string
  reviewed_at?: string
  created_at: string
}

export const useSuggestions = () => {
  const toast = useToast()

  const suggestions = ref<Suggestion[]>([])
  const loading = ref(false)
  const actionLoading = ref(false)

  // Filtro de status activo
  const statusFilter = ref<SuggestionStatus | 'all'>('pending')

  // Fetch con filtro
  const fetch = async () => {
    loading.value = true
    try {
      const params = statusFilter.value !== 'all'
        ? { status: statusFilter.value }
        : {}

      suggestions.value = await $fetch<Suggestion[]>('/api/suggestions', {
        params
      })
    } catch (e: any) {
      toast.add({ title: 'Error cargando sugerencias', description: e.message, color: 'error' })
    } finally {
      loading.value = false
    }
  }

  // Aprobar — crea Place automáticamente
  const approve = async (id: string) => {
    actionLoading.value = true
    try {
      const result = await $fetch(`/api/suggestions/${id}/approve`, {
        method: 'POST'
      })
      toast.add({
        title: 'Sugerencia aprobada',
        description: `Se creó el lugar "${(result as any).place.name}"`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      await fetch()
    } catch (e: any) {
      toast.add({ title: 'Error al aprobar', description: e.message, color: 'error' })
    } finally {
      actionLoading.value = false
    }
  }

  // Rechazar con motivo
  const reject = async (id: string, reason: string) => {
    actionLoading.value = true
    try {
      await $fetch(`/api/suggestions/${id}`, {
        method: 'PUT',
        body: { status: 'rejected', rejection_reason: reason }
      })
      toast.add({
        title: 'Sugerencia rechazada',
        color: 'neutral',
        icon: 'i-lucide-x-circle'
      })
      await fetch()
    } catch (e: any) {
      toast.add({ title: 'Error al rechazar', description: e.message, color: 'error' })
    } finally {
      actionLoading.value = false
    }
  }

  // Eliminar
  const remove = async (id: string) => {
    actionLoading.value = true
    try {
      await $fetch(`/api/suggestions/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Sugerencia eliminada', color: 'neutral' })
      await fetch()
    } catch (e: any) {
      toast.add({ title: 'Error al eliminar', description: e.message, color: 'error' })
    } finally {
      actionLoading.value = false
    }
  }

  // Contadores por status
  const counts = computed(() => ({
    pending: suggestions.value.filter(s => s.status === 'pending').length,
    approved: suggestions.value.filter(s => s.status === 'approved').length,
    rejected: suggestions.value.filter(s => s.status === 'rejected').length
  }))

  // Re-fetch cuando cambia el filtro
  watch(statusFilter, fetch)

  return {
    suggestions,
    loading,
    actionLoading,
    statusFilter,
    counts,
    fetch,
    approve,
    reject,
    remove
  }
}

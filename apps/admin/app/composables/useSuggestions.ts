// app/composables/useSuggestions.ts

export type SuggestionStatus = 'pending' | 'approved' | 'rejected'

export interface Suggestion {
  id: string
  name_i18n: Record<string, string>
  description_i18n?: Record<string, string>
  location: { city?: string; region?: string; address?: string }
  age_range: { min?: number; max?: number; ids?: number[] } | null
  type: string[]
  best_season: string[]
  stroller_friendly: boolean
  open_weekends: boolean
  is_free: boolean
  schedule?: string
  images: string[]
  category_id?: string | null
  status: SuggestionStatus
  rejection_reason?: string
  reviewed_at?: string
  created_at: string
  metadata?: Record<string, unknown> | null
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
      const params = statusFilter.value !== 'all' ? { status: statusFilter.value } : {}

      suggestions.value = await $fetch<Suggestion[]>('/api/suggestions', {
        params,
      })
    } catch (e) {
      toast.add({
        title: 'Error cargando sugerencias',
        description: e instanceof Error ? e.message : String(e),
        color: 'error',
      })
    } finally {
      loading.value = false
    }
  }

  // Aprobar — crea Place automáticamente
  const approve = async (id: string) => {
    actionLoading.value = true
    try {
      const result = await $fetch<{ place?: { name_i18n?: Record<string, string> } }>(
        `/api/suggestions/${id}/approve`,
        {
          method: 'POST',
        }
      )
      const placeName =
        result.place?.name_i18n?.['es'] ||
        result.place?.name_i18n?.['he'] ||
        Object.values(result.place?.name_i18n ?? {})[0] ||
        'nuevo lugar'
      toast.add({
        title: 'Sugerencia aprobada',
        description: `Se creó el lugar "${placeName}"`,
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
      await fetch()
    } catch (e) {
      toast.add({
        title: 'Error al aprobar',
        description: e instanceof Error ? e.message : String(e),
        color: 'error',
      })
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
        body: { status: 'rejected', rejection_reason: reason },
      })
      toast.add({
        title: 'Sugerencia rechazada',
        color: 'neutral',
        icon: 'i-lucide-x-circle',
      })
      await fetch()
    } catch (e) {
      toast.add({
        title: 'Error al rechazar',
        description: e instanceof Error ? e.message : String(e),
        color: 'error',
      })
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
    } catch (e) {
      toast.add({
        title: 'Error al eliminar',
        description: e instanceof Error ? e.message : String(e),
        color: 'error',
      })
    } finally {
      actionLoading.value = false
    }
  }

  // Contadores por status
  const counts = computed(() => ({
    pending: suggestions.value.filter((s) => s.status === 'pending').length,
    approved: suggestions.value.filter((s) => s.status === 'approved').length,
    rejected: suggestions.value.filter((s) => s.status === 'rejected').length,
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
    remove,
  }
}

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

  // $fetch a rutas internas durante el SSR es una request nueva del proceso
  // Node, no del browser — no lleva la cookie de sesión salvo que se la
  // pasemos explícito. Sin esto, el primer render siempre trae la lista
  // vacía (o 401 silencioso) y recién se completa tras la re-fetch del
  // cliente post-hidratación: doble round-trip y un flash de datos vacíos.
  const cookieHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  const suggestions = ref<Suggestion[]>([])
  const total = ref(0)
  // Arranca en true — la página muestra un skeleton mientras esto es true y
  // no hay datos aún; el fetch inicial se dispara desde onMounted (no
  // bloquea la navegación), así que loading debe empezar "cargando" y no
  // depender de que onMounted alcance a correr en el mismo tick del render.
  const loading = ref(true)
  const actionLoading = ref(false)

  // Filtros
  const statusFilter = ref<SuggestionStatus | 'all'>('pending')
  const categoryFilter = ref('all')
  const cityFilter = ref('all')
  const isFreeFilter = ref<'all' | 'true' | 'false'>('all')
  const page = ref(1)
  const pageSize = ref(10)

  // Evita que los watchers de abajo disparen un fetch duplicado cuando la
  // URL trae filtros/página no-default al montar (syncUrlPage/syncUrlParam
  // asignan esos valores de forma síncrona antes de onMounted, lo que ya
  // dispara estos watchers) — el fetch inicial real lo hace onMounted, una
  // sola vez. Sin esto también se podía pisar un ?page=2 de un deep-link,
  // reseteándolo a 1 antes de que el fetch inicial llegara a usarlo.
  const hasLoadedOnce = ref(false)

  // Fetch con filtros y paginación
  const fetch = async () => {
    loading.value = true
    try {
      const params: Record<string, string | number> = { page: page.value, pageSize: pageSize.value }
      if (statusFilter.value !== 'all') params.status = statusFilter.value
      if (categoryFilter.value !== 'all') params.category_id = categoryFilter.value
      if (cityFilter.value !== 'all') params.city = cityFilter.value
      if (isFreeFilter.value !== 'all') params.is_free = isFreeFilter.value

      const result = await $fetch<{ data: Suggestion[]; count: number }>('/api/suggestions', {
        params,
        headers: cookieHeaders,
      })
      suggestions.value = result.data
      total.value = result.count
    } catch (e) {
      toast.add({
        title: 'Error cargando sugerencias',
        description: e instanceof Error ? e.message : String(e),
        color: 'error',
      })
    } finally {
      loading.value = false
      hasLoadedOnce.value = true
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

  // Reset a página 1 cuando cambia cualquier filtro (dispara el watch de página)
  watch([statusFilter, categoryFilter, cityFilter, isFreeFilter], () => {
    if (!hasLoadedOnce.value) return
    if (page.value !== 1) page.value = 1
    else fetch()
  })

  // Re-fetch cuando cambia de página
  watch(page, () => {
    if (!hasLoadedOnce.value) return
    fetch()
  })

  return {
    suggestions,
    total,
    loading,
    actionLoading,
    statusFilter,
    categoryFilter,
    cityFilter,
    isFreeFilter,
    page,
    pageSize,
    counts,
    fetch,
    approve,
    reject,
    remove,
  }
}

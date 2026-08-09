// app/composables/usePlaces.ts
import { refDebounced } from '@vueuse/core'
import type { Place } from '~/types'

export interface PlacesFilters {
  q: string
  city: string | undefined
  status: string | undefined
  page: number
  pageSize: number
}

export const usePlaces = () => {
  const toast = useToast()

  // $fetch a rutas internas durante el SSR es una request nueva del proceso
  // Node, no del browser — no lleva la cookie de sesión salvo que se la
  // pasemos explícito. Sin esto, el primer render siempre trae la lista
  // vacía y recién se completa tras la re-fetch del cliente post-hidratación.
  const cookieHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  const places = ref<Place[]>([])
  const total = ref(0)
  const loading = ref(false)

  const filters = reactive<PlacesFilters>({
    q: '',
    city: 'all',
    status: 'all',
    page: 1,
    pageSize: 10,
  })

  // Debounce sólo del search para no martillar el server al teclear
  const debouncedQ = refDebounced(toRef(filters, 'q'), 300)

  const fetch = async () => {
    loading.value = true
    try {
      const params: Record<string, string | number> = {
        page: filters.page,
        pageSize: filters.pageSize,
      }
      if (debouncedQ.value) params.q = debouncedQ.value
      if (filters.city && filters.city !== 'all') params.city = filters.city
      if (filters.status && filters.status !== 'all') params.status = filters.status

      const res = await $fetch<{ data: Place[]; count: number }>('/api/places', {
        params,
        headers: cookieHeaders,
      })
      places.value = res.data
      total.value = res.count
    } catch (e: unknown) {
      toast.add({
        title: 'Error cargando lugares',
        description: e instanceof Error ? e.message : String(e),
        color: 'error',
      })
    } finally {
      loading.value = false
    }
  }

  const remove = async (id: string) => {
    try {
      await $fetch(`/api/places/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Lugar eliminado', color: 'success' })
      await fetch()
    } catch (e: unknown) {
      toast.add({
        title: 'Error al eliminar',
        description: e instanceof Error ? e.message : String(e),
        color: 'error',
      })
      throw e
    }
  }

  // Reset a página 1 cuando cambian filtros (no cuando cambia la página misma)
  watch([debouncedQ, () => filters.city, () => filters.status], () => {
    if (filters.page !== 1) {
      filters.page = 1
    } else {
      fetch()
    }
  })

  // Re-fetch cuando cambia página o pageSize
  watch([() => filters.page, () => filters.pageSize], fetch)

  return {
    places,
    total,
    loading,
    filters,
    fetch,
    remove,
  }
}

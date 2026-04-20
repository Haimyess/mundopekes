import type { Tables } from '~/types/database.types'

export type Provider = Tables<'providers'>

export const useProviders = () => {
  const toast = useToast()

  const providers = ref<Provider[]>([])
  const total = ref(0)
  const page = ref(1)
  const isLoading = ref(false)
  const status = ref('pending')
  const selectedProvider = ref<Provider | null>(null)

  const totalPages = computed(() => Math.ceil(total.value / 20))

  const fetch = async () => {
    isLoading.value = true
    try {
      const params: Record<string, string | number> = { page: page.value, limit: 20 }
      if (status.value && status.value !== 'all') params.status = status.value

      const result = await $fetch<{
        data: Provider[]
        count: number
        page: number
        totalPages: number
      }>('/api/providers', { params })
      providers.value = result.data
      total.value = result.count
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      toast.add({ title: 'Error cargando proveedores', description: msg, color: 'error' })
    } finally {
      isLoading.value = false
    }
  }

  const fetchOne = async (id: string) => {
    try {
      selectedProvider.value = await $fetch<Provider>(`/api/providers/${id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      toast.add({ title: 'Error cargando proveedor', description: msg, color: 'error' })
    }
  }

  const updateStatus = async (
    id: string,
    newStatus: 'active' | 'suspended' | 'rejected',
    notes?: string
  ) => {
    try {
      await $fetch(`/api/providers/${id}`, {
        method: 'PATCH',
        body: { status: newStatus, notes },
      })
      toast.add({ title: 'Estado actualizado', color: 'success' })
      await fetch()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      toast.add({ title: 'Error al actualizar', description: msg, color: 'error' })
    }
  }

  watch([status], () => {
    page.value = 1
    fetch()
  })

  watch(page, fetch)

  return {
    providers,
    total,
    page,
    totalPages,
    isLoading,
    status,
    selectedProvider,
    fetch,
    fetchOne,
    updateStatus,
  }
}

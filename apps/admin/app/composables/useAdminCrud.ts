// app/composables/useAdminCrud.ts
// Shared fetch/create/update/remove shape used by useCategories and useFaqs
// (identical boilerplate in both before this factory existed). Composables
// with extra behavior — pagination, debounce, domain-specific actions like
// approve/reject — stay hand-written (useActivities, useProviders,
// useSuggestions): forcing those into this shape would leak their extra
// concerns back out through the factory's options, not simplify them.
export interface AdminCrudLabels {
  loadError: string
  created: string
  createError: string
  updated: string
  updateError: string
  deleted: string
  deleteError: string
}

export const useAdminCrud = <T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  endpoint: string,
  labels: AdminCrudLabels
) => {
  const toast = useToast()
  const items = ref<T[]>([]) as Ref<T[]>
  // Arranca en true — ver el comentario equivalente en useSuggestions.ts.
  const loading = ref(true)
  const saving = ref(false)

  const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))

  const fetch = async (params?: Record<string, unknown>) => {
    loading.value = true
    try {
      items.value = await $fetch<T[]>(endpoint, { params })
    } catch (e) {
      toast.add({ title: labels.loadError, description: errorMessage(e), color: 'error' })
    } finally {
      loading.value = false
    }
  }

  const create = async (data: TCreate) => {
    saving.value = true
    try {
      await $fetch(endpoint, { method: 'POST', body: data as Record<string, unknown> })
      toast.add({ title: labels.created, color: 'success' })
      await fetch()
    } catch (e) {
      toast.add({ title: labels.createError, description: errorMessage(e), color: 'error' })
    } finally {
      saving.value = false
    }
  }

  const update = async (id: string, data: TUpdate) => {
    saving.value = true
    try {
      await $fetch(`${endpoint}/${id}`, { method: 'PUT', body: data as Record<string, unknown> })
      toast.add({ title: labels.updated, color: 'success' })
      await fetch()
    } catch (e) {
      toast.add({ title: labels.updateError, description: errorMessage(e), color: 'error' })
    } finally {
      saving.value = false
    }
  }

  const remove = async (id: string) => {
    saving.value = true
    try {
      await $fetch(`${endpoint}/${id}`, { method: 'DELETE' })
      toast.add({ title: labels.deleted, color: 'neutral' })
      await fetch()
    } catch (e) {
      toast.add({ title: labels.deleteError, description: errorMessage(e), color: 'error' })
    } finally {
      saving.value = false
    }
  }

  return { items, loading, saving, fetch, create, update, remove }
}

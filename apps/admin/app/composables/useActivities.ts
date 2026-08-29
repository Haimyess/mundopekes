// app/composables/useActivities.ts
import { refDebounced } from '@vueuse/core'
import type { Activity } from '~/types'

export type ActivityStatus = 'pending' | 'approved' | 'rejected'

export interface ActivitiesFilters {
  q: string
  category_id: string | undefined
  status: ActivityStatus | 'all'
  place_id: string | undefined
  is_free: boolean | undefined
  page: number
  pageSize: number
}

export interface UseActivitiesOptions {
  /** Si se pasa, fija el place_id y lo bloquea (uso desde places/[id].vue) */
  placeId?: string
  /** pageSize inicial */
  pageSize?: number
}

export const useActivities = (options: UseActivitiesOptions = {}) => {
  const { t } = useI18n()
  const toast = useToast()

  // $fetch a rutas internas durante el SSR es una request nueva del proceso
  // Node, no del browser — no lleva la cookie de sesión salvo que se la
  // pasemos explícito. Sin esto, el primer render siempre trae la lista
  // vacía y recién se completa tras la re-fetch del cliente post-hidratación.
  const cookieHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  const activities = ref<Activity[]>([])
  const total = ref(0)
  // Arranca en true — ver el comentario equivalente en useSuggestions.ts.
  const loading = ref(true)
  const saving = ref(false)

  const filters = reactive<ActivitiesFilters>({
    q: '',
    category_id: undefined,
    status: 'all',
    place_id: options.placeId,
    is_free: undefined,
    page: 1,
    pageSize: options.pageSize ?? 20,
  })

  // Debounce sólo del search para no martillar el server al teclear
  const debouncedQ = refDebounced(toRef(filters, 'q'), 300)

  // Evita que los watchers de abajo disparen un fetch duplicado cuando la
  // URL trae filtros/página no-default al montar — ver el comentario
  // equivalente en useSuggestions.ts.
  const hasLoadedOnce = ref(false)

  const fetch = async () => {
    loading.value = true
    try {
      const params: Record<string, any> = {
        page: filters.page,
        pageSize: filters.pageSize,
      }
      if (debouncedQ.value) params.q = debouncedQ.value
      if (filters.category_id) params.category_id = filters.category_id
      if (filters.status !== 'all') params.status = filters.status
      if (filters.place_id) params.place_id = filters.place_id
      if (filters.is_free !== undefined) params.is_free = filters.is_free

      const res = await $fetch<{ data: Activity[]; count: number }>('/api/activities', {
        params,
        headers: cookieHeaders,
      })
      activities.value = res.data
      total.value = res.count
    } catch (e: any) {
      toast.add({
        title: t('activities.toast.loadError'),
        description: e.message,
        color: 'error',
      })
    } finally {
      loading.value = false
      hasLoadedOnce.value = true
    }
  }

  const create = async (data: Partial<Activity>) => {
    saving.value = true
    try {
      await $fetch('/api/activities', { method: 'POST', body: data })
      toast.add({ title: t('activities.toast.created'), color: 'success' })
      await fetch()
    } catch (e: any) {
      toast.add({
        title: t('activities.toast.createError'),
        description: e.message,
        color: 'error',
      })
      throw e
    } finally {
      saving.value = false
    }
  }

  const update = async (id: string, data: Partial<Activity>) => {
    saving.value = true
    try {
      await $fetch(`/api/activities/${id}`, { method: 'PUT', body: data })
      toast.add({ title: t('activities.toast.updated'), color: 'success' })
      await fetch()
    } catch (e: any) {
      toast.add({
        title: t('activities.toast.updateError'),
        description: e.message,
        color: 'error',
      })
      throw e
    } finally {
      saving.value = false
    }
  }

  const remove = async (id: string) => {
    saving.value = true
    try {
      await $fetch(`/api/activities/${id}`, { method: 'DELETE' })
      toast.add({ title: t('activities.toast.deleted'), color: 'neutral' })
      await fetch()
    } catch (e: any) {
      toast.add({
        title: t('activities.toast.deleteError'),
        description: e.message,
        color: 'error',
      })
      throw e
    } finally {
      saving.value = false
    }
  }

  const removeMany = async (ids: string[]) => {
    saving.value = true
    try {
      await Promise.all(ids.map((id) => $fetch(`/api/activities/${id}`, { method: 'DELETE' })))
      toast.add({
        title: t(
          ids.length > 1
            ? 'activities.toast.deletedManyPlural'
            : 'activities.toast.deletedManySingular',
          { count: ids.length }
        ),
        color: 'neutral',
      })
      await fetch()
    } catch (e: any) {
      toast.add({
        title: t('activities.toast.deleteError'),
        description: e.message,
        color: 'error',
      })
      throw e
    } finally {
      saving.value = false
    }
  }

  // Reset a página 1 cuando cambian filtros (no cuando cambia la página misma)
  watch(
    [
      debouncedQ,
      () => filters.category_id,
      () => filters.status,
      () => filters.place_id,
      () => filters.is_free,
    ],
    () => {
      if (!hasLoadedOnce.value) return
      if (filters.page !== 1) {
        filters.page = 1 // dispara el otro watch
      } else {
        fetch()
      }
    }
  )

  // Re-fetch cuando cambia página o pageSize
  watch([() => filters.page, () => filters.pageSize], () => {
    if (!hasLoadedOnce.value) return
    fetch()
  })

  return {
    // estado
    activities,
    total,
    loading,
    saving,
    filters,
    // acciones
    fetch,
    create,
    update,
    remove,
    removeMany,
  }
}

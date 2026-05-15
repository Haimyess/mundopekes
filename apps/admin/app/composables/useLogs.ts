import { refDebounced } from '@vueuse/core'
import type { Tables } from '~/types/database.types'

export type AppLog = Tables<'app_logs'>

export const useLogs = () => {
  const toast = useToast()

  const logs = ref<AppLog[]>([])
  const total = ref(0)
  const page = ref(1)
  const isLoading = ref(false)
  const errorsLast24h = ref(0)

  const level = ref<string | undefined>(undefined)
  const context = ref<string | undefined>(undefined)
  const searchRaw = ref('')
  const search = refDebounced(searchRaw, 300)

  const totalPages = computed(() => Math.ceil(total.value / 50))

  const fetch = async () => {
    isLoading.value = true
    try {
      const params: Record<string, string | number> = { page: page.value, limit: 50 }
      if (level.value) params.level = level.value
      if (context.value) params.context = context.value

      const result = await $fetch<{
        data: AppLog[]
        count: number
        page: number
        totalPages: number
      }>('/api/logs', { params })
      logs.value = result.data
      total.value = result.count
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      toast.add({ title: 'Error cargando logs', description: msg, color: 'error' })
    } finally {
      isLoading.value = false
    }
  }

  const fetchErrorCount = async () => {
    try {
      const result = await $fetch<{ count: number }>('/api/logs/error-count')
      errorsLast24h.value = result.count
    } catch {
      errorsLast24h.value = 0
    }
  }

  const getRowClass = (logLevel: string) => {
    if (logLevel === 'error') return 'bg-red-50 dark:bg-red-950/20'
    if (logLevel === 'warn') return 'bg-yellow-50 dark:bg-yellow-950/20'
    return ''
  }

  watch([level, context, search], () => {
    page.value = 1
    fetch()
  })

  watch(page, fetch)

  return {
    logs,
    total,
    page,
    totalPages,
    isLoading,
    errorsLast24h,
    level,
    context,
    searchRaw,
    fetch,
    fetchErrorCount,
    getRowClass,
  }
}

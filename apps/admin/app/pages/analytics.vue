<!-- app/pages/analytics.vue -->
<script setup lang="ts">
interface AnalyticsSummary {
  totalActivities: number
  totalPlaces: number
  totalSuggestions: number
  pendingSuggestions: number
  totalContactRequests: number
  pendingContactRequests: number
  totalLogs: number
  errorLogs: number
  recentErrors: Array<{
    id: string
    level: string
    context: string
    message: string
    created_at: string
    metadata: unknown
  }>
  recentFeedbacks: Array<{
    id: string
    name: string
    email: string
    message: string
    created_at: string
    status: string
  }>
}

const summary = ref<AnalyticsSummary | null>(null)
const isLoading = ref(false)

const formatDate = (date: string) => {
  const d = new Date(date)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const load = async () => {
  isLoading.value = true
  try {
    summary.value = await $fetch<AnalyticsSummary>('/api/analytics/summary')
  } finally {
    isLoading.value = false
  }
}

const cards = computed(() => {
  if (!summary.value) return []
  return [
    {
      label: 'Actividades',
      value: summary.value.totalActivities,
      icon: 'i-lucide-zap',
      color: 'text-primary',
    },
    {
      label: 'Lugares',
      value: summary.value.totalPlaces,
      icon: 'i-lucide-map-pin',
      color: 'text-primary',
    },
    {
      label: 'Sugerencias',
      value: summary.value.totalSuggestions,
      icon: 'i-lucide-lightbulb',
      color: 'text-primary',
    },
    {
      label: 'Sugerencias pendientes',
      value: summary.value.pendingSuggestions,
      icon: 'i-lucide-clock',
      color: 'text-warning-500',
    },
    {
      label: 'Consultas totales',
      value: summary.value.totalContactRequests,
      icon: 'i-lucide-message-circle',
      color: 'text-primary',
    },
    {
      label: 'Consultas pendientes',
      value: summary.value.pendingContactRequests,
      icon: 'i-lucide-inbox',
      color: 'text-warning-500',
    },
    {
      label: 'Logs totales',
      value: summary.value.totalLogs,
      icon: 'i-lucide-terminal',
      color: 'text-primary',
    },
    {
      label: 'Errores (24h)',
      value: summary.value.errorLogs,
      icon: 'i-lucide-alert-triangle',
      color: 'text-error-500',
    },
  ]
})

await load()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Analytics">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="isLoading"
            @click="load"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 flex flex-col gap-6">
        <!-- Grid de métricas -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            v-for="card in cards"
            :key="card.label"
            class="bg-elevated rounded-xl p-4 flex flex-col gap-2 border border-default"
          >
            <div class="flex items-center gap-2">
              <UIcon :name="card.icon" :class="['size-4', card.color]" />
              <span class="text-xs text-(--ui-text-muted)">{{ card.label }}</span>
            </div>
            <span class="text-2xl font-bold">{{ card.value }}</span>
          </div>
        </div>

        <!-- Feedbacks recientes -->
        <div v-if="summary && summary.recentFeedbacks.length > 0">
          <h2 class="text-sm font-semibold mb-3 text-(--ui-text-muted) uppercase tracking-wider">
            Feedbacks recientes
          </h2>
          <div class="flex flex-col gap-2">
            <div
              v-for="fb in summary.recentFeedbacks"
              :key="fb.id"
              class="bg-elevated border border-default rounded-lg p-3 flex flex-col gap-1"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">{{ fb.name }}</span>
                <span class="text-xs text-(--ui-text-muted)">{{ fb.email }}</span>
                <span class="text-xs text-(--ui-text-muted) ml-auto">{{
                  formatDate(fb.created_at)
                }}</span>
              </div>
              <p class="text-sm text-(--ui-text-muted) line-clamp-2">
                {{ fb.message }}
              </p>
            </div>
          </div>
        </div>

        <!-- Errores recientes -->
        <div v-if="summary">
          <h2 class="text-sm font-semibold mb-3 text-(--ui-text-muted) uppercase tracking-wider">
            Errores recientes
          </h2>
          <div
            v-if="summary.recentErrors.length === 0"
            class="text-sm text-(--ui-text-muted) py-4 text-center"
          >
            Sin errores recientes
          </div>
          <div v-else class="flex flex-col gap-2">
            <div
              v-for="err in summary.recentErrors"
              :key="err.id"
              class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 flex flex-col gap-1"
            >
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs text-(--ui-text-muted)">{{ err.context }}</span>
                <span class="text-xs text-(--ui-text-muted) ml-auto">{{
                  formatDate(err.created_at)
                }}</span>
              </div>
              <span class="text-sm text-red-700 dark:text-red-300">{{ err.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

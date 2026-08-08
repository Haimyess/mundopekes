<script setup lang="ts">
interface AnalyticsSummary {
  totalActivities: number
  totalPlaces: number
  totalSuggestions: number
  pendingSuggestions: number
  totalContactRequests: number
  pendingContactRequests: number
  recentFeedbacks: Array<{
    id: string
    name: string
    email: string
    message: string
    created_at: string
    status: string
  }>
}

const { t } = useI18n()

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
      label: t('overview.cards.activities'),
      value: summary.value.totalActivities,
      icon: 'i-lucide-zap',
      color: 'text-primary',
    },
    {
      label: t('overview.cards.places'),
      value: summary.value.totalPlaces,
      icon: 'i-lucide-map-pin',
      color: 'text-primary',
    },
    {
      label: t('overview.cards.suggestions'),
      value: summary.value.totalSuggestions,
      icon: 'i-lucide-lightbulb',
      color: 'text-primary',
    },
    {
      label: t('overview.cards.pendingSuggestions'),
      value: summary.value.pendingSuggestions,
      icon: 'i-lucide-clock',
      color: 'text-warning-500',
    },
    {
      label: t('overview.cards.totalContactRequests'),
      value: summary.value.totalContactRequests,
      icon: 'i-lucide-message-circle',
      color: 'text-primary',
    },
    {
      label: t('overview.cards.pendingContactRequests'),
      value: summary.value.pendingContactRequests,
      icon: 'i-lucide-inbox',
      color: 'text-warning-500',
    },
  ]
})

await load()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('overview.title')">
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
            {{ t('overview.recentFeedbacks') }}
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
      </div>
    </template>
  </UDashboardPanel>
</template>

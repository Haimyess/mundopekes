<script setup lang="ts">
import type { Period } from '~/types'
import EventsChart from '~/components/user-events/EventsChart.client.vue'
import EventsDonutChart from '~/components/user-events/EventsDonutChart.client.vue'

const { t, locale } = useI18n()
const { tc } = useI18nContent()
const eventTypeLabels = useEventTypeLabels()

const {
  range,
  catalog,
  traffic,
  trafficPrevious,
  isLoading,
  fetch: load,
  trend,
  searchSuccessRate,
  weekdayData,
  peakWeekday,
} = useHomeDashboard()

const period = ref<Period>('daily')

const formatPercent = (value: number) =>
  new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 1 }).format(value)

const formatTrend = (value: number | null) => {
  if (value === null) return null
  const sign = value > 0 ? '+' : ''
  return {
    text: `${sign}${formatPercent(value)}`,
    color: value >= 0 ? 'text-primary' : 'text-error',
  }
}

const searchesCount = (summary: typeof traffic.value) =>
  summary?.eventsByType.find((e) => e.event_type === 'search')?.count ?? 0

const eventsTrend = computed(() =>
  formatTrend(trend(traffic.value?.eventsInRange ?? 0, trafficPrevious.value?.eventsInRange ?? 0))
)
const sessionsTrend = computed(() =>
  formatTrend(
    trend(traffic.value?.distinctSessions ?? 0, trafficPrevious.value?.distinctSessions ?? 0)
  )
)
const searchesTrend = computed(() =>
  formatTrend(trend(searchesCount(traffic.value), searchesCount(trafficPrevious.value)))
)

const weekdayPeakCaption = computed(() =>
  peakWeekday.value
    ? t('dashboard.weekdayPeakCaption', { day: peakWeekday.value.label })
    : undefined
)

const eventsByTypeDonutData = computed(
  () =>
    traffic.value?.eventsByType.map((item) => ({
      label: eventTypeLabels.value[item.event_type] ?? item.event_type,
      value: item.count,
    })) ?? []
)

const topCategoriesDonutData = computed(
  () =>
    traffic.value?.topCategories.map((item) => ({
      label: item.name_i18n ? tc(item.name_i18n) : item.slug,
      value: item.count,
    })) ?? []
)

const topActivitiesRanked = computed(() =>
  (traffic.value?.topActivities ?? []).slice(0, 5).map((a) => ({
    label: a.title,
    value: a.views,
    sublabel: `${a.directions} · ${formatPercent(a.conversion_rate)}`,
    to: `/business-report?type=activity&id=${a.activity_id}`,
  }))
)

const topPlacesRanked = computed(() =>
  (traffic.value?.topPlaces ?? []).slice(0, 5).map((p) => ({
    label: p.title,
    value: p.views,
    sublabel: `${p.directions}`,
    to: `/business-report?type=place&id=${p.place_id}`,
  }))
)

const recentFeedbacks = computed(() => catalog.value?.recentFeedbacks.slice(0, 3) ?? [])

const formatDate = (date: string) => {
  const d = new Date(date)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

await load()
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar :title="t('dashboard.home')">
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

      <UDashboardToolbar>
        <template #left>
          <HomeDateRangePicker v-model="range" class="-ms-1" />
          <HomePeriodSelect v-model="period" :range="range" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="p-4 flex flex-col gap-6">
        <!-- Catálogo -->
        <DashboardSectionCard :title="t('dashboard.catalogTitle')">
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div class="flex flex-col gap-1">
              <span class="text-xs text-(--ui-text-muted)">{{
                t('dashboard.catalogActivities')
              }}</span>
              <span class="text-xl font-bold tabular-nums">{{
                catalog?.totalActivities ?? '—'
              }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs text-(--ui-text-muted)">{{ t('dashboard.catalogPlaces') }}</span>
              <span class="text-xl font-bold tabular-nums">{{ catalog?.totalPlaces ?? '—' }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs text-(--ui-text-muted)">{{
                t('dashboard.catalogProviders')
              }}</span>
              <span class="text-xl font-bold tabular-nums">{{
                catalog?.totalProviders ?? '—'
              }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs text-(--ui-text-muted)">{{
                t('dashboard.catalogPendingSuggestions')
              }}</span>
              <span
                class="text-xl font-bold tabular-nums"
                :class="{ 'text-warning': (catalog?.pendingSuggestions ?? 0) > 0 }"
              >
                {{ catalog?.pendingSuggestions ?? '—' }}
              </span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs text-(--ui-text-muted)">{{
                t('dashboard.catalogPendingContacts')
              }}</span>
              <span
                class="text-xl font-bold tabular-nums"
                :class="{ 'text-warning': (catalog?.pendingContactRequests ?? 0) > 0 }"
              >
                {{ catalog?.pendingContactRequests ?? '—' }}
              </span>
            </div>
          </div>
        </DashboardSectionCard>

        <!-- Tráfico: stat cards con tendencia -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="bg-elevated rounded-2xl p-5 flex flex-col gap-2 border border-default">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-trending-up" class="size-4 text-primary" />
              <span class="text-xs text-(--ui-text-muted)">{{ t('dashboard.eventsInRange') }}</span>
            </div>
            <span class="text-3xl font-bold tabular-nums">{{ traffic?.eventsInRange ?? '—' }}</span>
            <span v-if="eventsTrend" class="text-xs font-medium" :class="eventsTrend.color">
              {{ eventsTrend.text }} {{ t('dashboard.vsPreviousPeriod') }}
            </span>
          </div>
          <div class="bg-elevated rounded-2xl p-5 flex flex-col gap-2 border border-default">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="size-4 text-primary" />
              <span class="text-xs text-(--ui-text-muted)">{{ t('dashboard.sessions') }}</span>
            </div>
            <span class="text-3xl font-bold tabular-nums">{{
              traffic?.distinctSessions ?? '—'
            }}</span>
            <span v-if="sessionsTrend" class="text-xs font-medium" :class="sessionsTrend.color">
              {{ sessionsTrend.text }} {{ t('dashboard.vsPreviousPeriod') }}
            </span>
          </div>
          <div class="bg-elevated rounded-2xl p-5 flex flex-col gap-2 border border-default">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-search" class="size-4 text-primary" />
              <span class="text-xs text-(--ui-text-muted)">{{ t('dashboard.searches') }}</span>
            </div>
            <span class="text-3xl font-bold tabular-nums">{{ searchesCount(traffic) }}</span>
            <span v-if="searchesTrend" class="text-xs font-medium" :class="searchesTrend.color">
              {{ searchesTrend.text }} {{ t('dashboard.vsPreviousPeriod') }}
            </span>
          </div>
          <div class="bg-elevated rounded-2xl p-5 flex flex-col gap-2 border border-default">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-target" class="size-4 text-primary" />
              <span class="text-xs text-(--ui-text-muted)">{{
                t('dashboard.searchSuccessRate')
              }}</span>
            </div>
            <span class="text-3xl font-bold tabular-nums">
              {{ searchSuccessRate !== null ? formatPercent(searchSuccessRate) : '—' }}
            </span>
          </div>
        </div>

        <!-- Tendencia + widgets laterales -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2">
            <DashboardSectionCard :title="t('dashboard.trendTitle')">
              <p
                v-if="!traffic || traffic.timeseries.length === 0"
                class="text-sm text-(--ui-text-muted) text-center py-8"
              >
                {{ t('dashboard.emptyTraffic') }}
              </p>
              <EventsChart v-else :data="traffic.timeseries" :period="period" />
            </DashboardSectionCard>
          </div>
          <div class="flex flex-col gap-6">
            <DashboardSectionCard :title="t('dashboard.weekdayTitle')">
              <DashboardWeekdayBarChart :days="weekdayData" :peak-caption="weekdayPeakCaption" />
            </DashboardSectionCard>
            <DashboardSectionCard>
              <DashboardGaugeChart
                :value="searchSuccessRate ?? 0"
                :caption="t('dashboard.gaugeCaption')"
              />
            </DashboardSectionCard>
          </div>
        </div>

        <!-- Donuts -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardSectionCard :title="t('userEvents.sections.byType')">
            <p
              v-if="eventsByTypeDonutData.length === 0"
              class="text-sm text-(--ui-text-muted) text-center py-4"
            >
              {{ t('dashboard.emptyTraffic') }}
            </p>
            <EventsDonutChart v-else :data="eventsByTypeDonutData" />
          </DashboardSectionCard>
          <DashboardSectionCard :title="t('userEvents.sections.byCategory')">
            <p
              v-if="topCategoriesDonutData.length === 0"
              class="text-sm text-(--ui-text-muted) text-center py-4"
            >
              {{ t('userEvents.emptyCategories') }}
            </p>
            <EventsDonutChart v-else :data="topCategoriesDonutData" />
          </DashboardSectionCard>
        </div>

        <!-- Rankings -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardSectionCard :title="t('userEvents.sections.topActivities')">
            <template #actions>
              <UButton
                to="/user-events"
                color="neutral"
                variant="ghost"
                size="xs"
                trailing-icon="i-lucide-arrow-right"
              >
                {{ t('dashboard.viewAll') }}
              </UButton>
            </template>
            <p
              v-if="topActivitiesRanked.length === 0"
              class="text-sm text-(--ui-text-muted) text-center py-4"
            >
              {{ t('userEvents.emptyActivities') }}
            </p>
            <DashboardRankedBarList v-else :items="topActivitiesRanked" />
          </DashboardSectionCard>
          <DashboardSectionCard :title="t('userEvents.sections.topPlaces')">
            <template #actions>
              <UButton
                to="/user-events"
                color="neutral"
                variant="ghost"
                size="xs"
                trailing-icon="i-lucide-arrow-right"
              >
                {{ t('dashboard.viewAll') }}
              </UButton>
            </template>
            <p
              v-if="topPlacesRanked.length === 0"
              class="text-sm text-(--ui-text-muted) text-center py-4"
            >
              {{ t('userEvents.emptyPlaces') }}
            </p>
            <DashboardRankedBarList v-else :items="topPlacesRanked" />
          </DashboardSectionCard>
        </div>

        <!-- Feedback reciente -->
        <DashboardSectionCard
          v-if="recentFeedbacks.length > 0"
          :title="t('dashboard.recentFeedbackTitle')"
        >
          <template #actions>
            <UButton
              to="/overview"
              color="neutral"
              variant="ghost"
              size="xs"
              trailing-icon="i-lucide-arrow-right"
            >
              {{ t('dashboard.viewAll') }}
            </UButton>
          </template>
          <div class="flex flex-col gap-2">
            <div
              v-for="fb in recentFeedbacks"
              :key="fb.id"
              class="bg-default border border-default rounded-lg p-3 flex flex-col gap-1"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">{{ fb.name }}</span>
                <span class="text-xs text-(--ui-text-muted) ml-auto">{{
                  formatDate(fb.created_at)
                }}</span>
              </div>
              <p class="text-sm text-(--ui-text-muted) line-clamp-2">{{ fb.message }}</p>
            </div>
          </div>
        </DashboardSectionCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

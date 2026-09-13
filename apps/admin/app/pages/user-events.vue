<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Period } from '~/types'
import { syncUrlPage, syncUrlParam } from '~/composables/useUrlPage'
import EventsChart from '~/components/user-events/EventsChart.client.vue'
import EventsDonutChart from '~/components/user-events/EventsDonutChart.client.vue'
import type { RecentUserEvent } from '~/composables/useRecentUserEvents'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const { t, locale } = useI18n()
const { tc } = useI18nContent()
const eventTypeLabels = useEventTypeLabels()

const eventTypeOptions = computed(() => [
  { label: t('userEvents.filters.allEventTypes'), value: 'all' },
  ...USER_EVENT_TYPES.map((value) => ({ label: eventTypeLabels.value[value] ?? value, value })),
])

// ─── Overview: tarjetas, tendencia, donuts, top-N — controlado solo por fecha ──
const { summary, isLoading, range, fromDate, toDate, fetch: load } = useUserEvents()
syncUrlParam(fromDate, 'from')
syncUrlParam(toDate, 'to')

const period = ref<Period>('daily')

const formatPercent = (value: number) =>
  new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 1 }).format(value)

const formatAgeRange = (min: number | null, max: number | null) => {
  if (min === null || max === null) return '—'
  const toLabel = (months: number) =>
    months < 24 ? `${months}m` : `${Math.round(months / 12)}${locale.value === 'en' ? 'y' : 'a'}`
  return `${toLabel(min)} – ${toLabel(max)}`
}

const searchesTotal = computed(
  () => summary.value?.eventsByType.find((e) => e.event_type === 'search')?.count ?? 0
)

const eventsByTypeDonutData = computed(
  () =>
    summary.value?.eventsByType.map((item) => ({
      label: eventTypeLabels.value[item.event_type] ?? item.event_type,
      value: item.count,
    })) ?? []
)

const topCategoriesDonutData = computed(
  () =>
    summary.value?.topCategories.map((item) => ({
      label: item.name_i18n ? tc(item.name_i18n) : item.slug,
      value: item.count,
    })) ?? []
)

const topCitiesDonutData = computed(
  () => summary.value?.topCities.map((item) => ({ label: item.city_name, value: item.count })) ?? []
)

const topSearchesRanked = computed(
  () => summary.value?.topSearches.map((item) => ({ label: item.term, value: item.count })) ?? []
)

const zeroResultSearchesRanked = computed(
  () =>
    summary.value?.zeroResultSearches.map((item) => ({ label: item.term, value: item.count })) ?? []
)

const topAgeRangesRanked = computed(
  () =>
    summary.value?.topAgeRanges.map((item) => ({
      label: formatAgeRange(item.min_months, item.max_months),
      value: item.count,
    })) ?? []
)

const topActivitiesRanked = computed(
  () =>
    summary.value?.topActivities.map((item) => ({
      label: item.title,
      value: item.views,
      sublabel: `${item.contacts} ${t('userEvents.topActivitiesColumns.contacts').toLowerCase()} · ${item.directions} ${t('userEvents.topActivitiesColumns.directions').toLowerCase()} · ${formatPercent(item.conversion_rate)} ${t('userEvents.topActivitiesColumns.conversion').toLowerCase()}`,
      to: `/business-report?type=activity&id=${item.activity_id}`,
    })) ?? []
)

const topPlacesRanked = computed(
  () =>
    summary.value?.topPlaces.map((item) => ({
      label: item.title,
      value: item.views,
      sublabel: `${item.directions} ${t('userEvents.topActivitiesColumns.directions').toLowerCase()}`,
      to: `/business-report?type=place&id=${item.place_id}`,
    })) ?? []
)

// ─── Tabla "Eventos recientes": paginada, con su propio filtro de tipo ──────
const {
  events: recentEvents,
  page: recentPage,
  totalPages: recentTotalPages,
  total: recentTotal,
  isLoading: recentIsLoading,
  eventType: recentEventType,
  term: recentTerm,
  category: recentCategory,
  targetId: recentTargetId,
  filterOptions: recentFilterOptions,
  fetch: loadRecent,
} = useRecentUserEvents()
syncUrlPage(recentPage, 'eventsPage')
syncUrlParam(recentEventType, 'eventsType')
syncUrlParam(recentTerm, 'eventsTerm')
syncUrlParam(recentCategory, 'eventsCategory')
syncUrlParam(recentTargetId, 'eventsTarget')

// El botón de refresh del header antes solo llamaba a load() (stat cards +
// gráficos) y nunca a loadRecent() — la tabla "Eventos recientes" quedaba
// congelada aunque llegaran eventos nuevos.
const refresh = () => {
  load()
  loadRecent()
}

const termOptions = computed(() => [
  { label: t('userEvents.filters.allTerms'), value: 'all' },
  ...(recentFilterOptions.value.terms ?? []).map((o) => ({
    label: `${o.label} (${o.count})`,
    value: o.value,
  })),
])
const categoryOptions = computed(() => [
  { label: t('userEvents.filters.allCategories'), value: 'all' },
  ...(recentFilterOptions.value.categories ?? []).map((o) => ({
    label: `${o.label} (${o.count})`,
    value: o.value,
  })),
])
const targetOptions = computed(() => [
  { label: t('userEvents.filters.allTargets'), value: 'all' },
  ...(recentFilterOptions.value.activities ?? recentFilterOptions.value.places ?? []).map((o) => ({
    label: `${o.label} (${o.count})`,
    value: o.value,
  })),
])

const payloadModal = ref(false)
const selectedPayload = ref<unknown>(null)

const openPayload = (payload: unknown) => {
  selectedPayload.value = payload
  payloadModal.value = true
}

const formatDate = (date: string | null) => {
  if (!date) return '—'
  const d = new Date(date)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const columns = computed<TableColumn<RecentUserEvent>[]>(() => [
  {
    accessorKey: 'created_at',
    header: t('userEvents.columns.date'),
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-xs text-(--ui-text-muted) whitespace-nowrap' },
        formatDate(row.original.created_at)
      ),
  },
  {
    accessorKey: 'event_type',
    header: t('userEvents.columns.type'),
    cell: ({ row }) =>
      h(
        UBadge,
        { color: 'neutral', variant: 'subtle', size: 'sm' },
        () => eventTypeLabels.value[row.original.event_type] ?? row.original.event_type
      ),
  },
  {
    accessorKey: 'session_id',
    header: t('userEvents.columns.session'),
    cell: ({ row }) => {
      const sid = row.original.session_id
      return h('span', { class: 'font-mono text-xs' }, sid ? sid.slice(0, 8) + '…' : '—')
    },
  },
  {
    accessorKey: 'locale',
    header: t('userEvents.columns.locale'),
    cell: ({ row }) => {
      const loc = row.original.locale
      if (!loc) return h('span', {}, '—')
      return h(UBadge, { color: 'neutral', variant: 'subtle', size: 'xs' }, () => loc)
    },
  },
  {
    id: 'payload',
    header: t('userEvents.columns.payload'),
    cell: ({ row }) =>
      h(
        UButton,
        {
          size: 'xs',
          color: 'neutral',
          variant: 'outline',
          onClick: () => openPayload(row.original.payload),
        },
        () => t('userEvents.view')
      ),
  },
])

await Promise.all([load(), loadRecent()])
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('userEvents.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="isLoading || recentIsLoading"
            @click="refresh"
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
        <!-- Stat cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="bg-elevated rounded-2xl p-5 flex flex-col gap-2 border border-default">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-activity" class="size-4 text-primary" />
              <span class="text-xs text-(--ui-text-muted)">{{ t('userEvents.totalEvents') }}</span>
            </div>
            <span class="text-3xl font-bold tabular-nums">{{ summary?.totalEvents ?? '—' }}</span>
          </div>
          <div class="bg-elevated rounded-2xl p-5 flex flex-col gap-2 border border-default">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-trending-up" class="size-4 text-primary" />
              <span class="text-xs text-(--ui-text-muted)">{{
                t('userEvents.eventsInRange')
              }}</span>
            </div>
            <span class="text-3xl font-bold tabular-nums">{{ summary?.eventsInRange ?? '—' }}</span>
          </div>
          <div class="bg-elevated rounded-2xl p-5 flex flex-col gap-2 border border-default">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="size-4 text-primary" />
              <span class="text-xs text-(--ui-text-muted)">{{
                t('userEvents.distinctSessions')
              }}</span>
            </div>
            <span class="text-3xl font-bold tabular-nums">{{
              summary?.distinctSessions ?? '—'
            }}</span>
          </div>
          <div class="bg-elevated rounded-2xl p-5 flex flex-col gap-2 border border-default">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-search" class="size-4 text-primary" />
              <span class="text-xs text-(--ui-text-muted)">{{
                t('userEvents.searchesInRange')
              }}</span>
            </div>
            <span class="text-3xl font-bold tabular-nums">{{ searchesTotal }}</span>
          </div>
        </div>

        <!-- Tendencia -->
        <DashboardSectionCard
          :title="t('userEvents.sections.timeseries')"
          :subtitle="t('userEvents.sections.timeseriesHint')"
        >
          <EventsChart :data="summary?.timeseries ?? []" :period="period" />
        </DashboardSectionCard>

        <!-- Donuts: distribución, categorías, ciudades -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardSectionCard :title="t('userEvents.sections.byType')">
            <p
              v-if="eventsByTypeDonutData.length === 0"
              class="text-sm text-(--ui-text-muted) text-center py-4"
            >
              {{ t('userEvents.emptySearches') }}
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
          <DashboardSectionCard :title="t('userEvents.sections.byCity')">
            <p
              v-if="topCitiesDonutData.length === 0"
              class="text-sm text-(--ui-text-muted) text-center py-4"
            >
              {{ t('userEvents.emptyCities') }}
            </p>
            <EventsDonutChart v-else :data="topCitiesDonutData" />
          </DashboardSectionCard>
        </div>

        <!-- Búsquedas -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardSectionCard :title="t('userEvents.sections.topSearches')">
            <p
              v-if="topSearchesRanked.length === 0"
              class="text-sm text-(--ui-text-muted) text-center py-4"
            >
              {{ t('userEvents.emptySearches') }}
            </p>
            <DashboardRankedBarList v-else :items="topSearchesRanked" />
          </DashboardSectionCard>
          <DashboardSectionCard :title="t('userEvents.sections.zeroResultSearches')">
            <p
              v-if="zeroResultSearchesRanked.length === 0"
              class="text-sm text-(--ui-text-muted) text-center py-4"
            >
              {{ t('userEvents.emptyZeroResultSearches') }}
            </p>
            <DashboardRankedBarList v-else :items="zeroResultSearchesRanked" />
          </DashboardSectionCard>
        </div>

        <!-- Rangos etarios -->
        <DashboardSectionCard :title="t('userEvents.sections.byAgeRange')">
          <p
            v-if="topAgeRangesRanked.length === 0"
            class="text-sm text-(--ui-text-muted) text-center py-4"
          >
            {{ t('userEvents.emptyAgeRanges') }}
          </p>
          <DashboardRankedBarList v-else :items="topAgeRangesRanked" />
        </DashboardSectionCard>

        <!-- Actividades / Lugares más vistos -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardSectionCard :title="t('userEvents.sections.topActivities')">
            <p
              v-if="topActivitiesRanked.length === 0"
              class="text-sm text-(--ui-text-muted) text-center py-4"
            >
              {{ t('userEvents.emptyActivities') }}
            </p>
            <DashboardRankedBarList v-else :items="topActivitiesRanked" />
          </DashboardSectionCard>
          <DashboardSectionCard :title="t('userEvents.sections.topPlaces')">
            <p
              v-if="topPlacesRanked.length === 0"
              class="text-sm text-(--ui-text-muted) text-center py-4"
            >
              {{ t('userEvents.emptyPlaces') }}
            </p>
            <DashboardRankedBarList v-else :items="topPlacesRanked" />
          </DashboardSectionCard>
        </div>

        <!-- Eventos recientes: filtro propio + tabla paginada -->
        <DashboardSectionCard :title="t('userEvents.sections.recentEvents')">
          <template #actions>
            <UBadge color="neutral" variant="subtle" size="sm">
              {{ recentTotal }}
            </UBadge>
          </template>

          <div class="flex flex-wrap items-center gap-3">
            <USelect
              v-model="recentEventType"
              :items="eventTypeOptions"
              value-key="value"
              label-key="label"
              :placeholder="t('userEvents.filters.eventTypePlaceholder')"
              class="w-48"
            />
            <USelect
              v-if="recentEventType === 'search'"
              v-model="recentTerm"
              :items="termOptions"
              value-key="value"
              label-key="label"
              :placeholder="t('userEvents.filters.termPlaceholder')"
              class="w-56"
            />
            <USelect
              v-if="recentEventType === 'search'"
              v-model="recentCategory"
              :items="categoryOptions"
              value-key="value"
              label-key="label"
              :placeholder="t('userEvents.filters.categoryPlaceholder')"
              class="w-48"
            />
            <USelect
              v-if="['activity_view', 'place_view', 'directions_click'].includes(recentEventType)"
              v-model="recentTargetId"
              :items="targetOptions"
              value-key="value"
              label-key="label"
              :placeholder="t('userEvents.filters.targetPlaceholder')"
              class="w-56"
            />
          </div>

          <UTable
            :data="recentEvents"
            :columns="columns"
            :loading="recentIsLoading"
            class="w-full"
            :ui="{
              base: 'table-fixed border-separate border-spacing-0',
              thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
              tbody:
                '[&>tr]:last:[&>td]:border-b-0 [&>tr]:hover:bg-elevated/50 [&>tr]:transition-colors',
              th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
              td: 'border-b border-default',
            }"
          />
          <div v-if="recentTotalPages > 1" class="flex justify-center pt-4">
            <UPagination v-model:page="recentPage" :total="recentTotal" :items-per-page="50" />
          </div>
        </DashboardSectionCard>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Modal payload -->
  <UModal v-model:open="payloadModal" :title="t('userEvents.payloadModalTitle')">
    <template #body>
      <pre class="text-xs overflow-auto max-h-96 bg-elevated rounded p-3">{{
        JSON.stringify(selectedPayload, null, 2)
      }}</pre>
    </template>
  </UModal>
</template>

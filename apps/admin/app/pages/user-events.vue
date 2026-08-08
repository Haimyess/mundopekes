<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

interface UserEventsSummary {
  totalEvents: number
  eventsLast7Days: number
  topSearches: Array<{ term: string; count: number }>
  topActivities: Array<{ activity_id: string; title: string; count: number }>
  eventsByType: Array<{ event_type: string; count: number }>
  recentEvents: Array<{
    id: string
    event_type: string
    session_id: string | null
    locale: string | null
    payload: Record<string, unknown>
    created_at: string | null
  }>
}

const { t } = useI18n()

const eventTypeLabels = computed<Record<string, string>>(() => ({
  page_view: t('userEvents.eventTypes.pageView'),
  search: t('userEvents.eventTypes.search'),
  activity_view: t('userEvents.eventTypes.activityView'),
  contact_send: t('userEvents.eventTypes.contactSend'),
  suggestion_submit: t('userEvents.eventTypes.suggestionSubmit'),
  provider_interest: t('userEvents.eventTypes.providerInterest'),
}))

const summary = ref<UserEventsSummary | null>(null)
const isLoading = ref(false)
const payloadModal = ref(false)
const selectedPayload = ref<unknown>(null)

const formatDate = (date: string | null) => {
  if (!date) return '—'
  const d = new Date(date)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const load = async () => {
  isLoading.value = true
  try {
    summary.value = await $fetch<UserEventsSummary>('/api/user-events/summary')
  } finally {
    isLoading.value = false
  }
}

type RecentEvent = UserEventsSummary['recentEvents'][number]

const columns = computed<TableColumn<RecentEvent>[]>(() => [
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
          onClick: () => {
            selectedPayload.value = row.original.payload
            payloadModal.value = true
          },
        },
        () => t('userEvents.view')
      ),
  },
])

await load()
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
            :loading="isLoading"
            @click="load"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 flex flex-col gap-6">
        <!-- SECTION 1 — Stat cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-elevated rounded-xl p-4 flex flex-col gap-2 border border-default">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-activity" class="size-4 text-primary" />
              <span class="text-xs text-(--ui-text-muted)">{{ t('userEvents.totalEvents') }}</span>
            </div>
            <span class="text-2xl font-bold">{{ summary?.totalEvents ?? '—' }}</span>
          </div>
          <div class="bg-elevated rounded-xl p-4 flex flex-col gap-2 border border-default">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-trending-up" class="size-4 text-primary" />
              <span class="text-xs text-(--ui-text-muted)">{{ t('userEvents.last7Days') }}</span>
            </div>
            <span class="text-2xl font-bold">{{ summary?.eventsLast7Days ?? '—' }}</span>
          </div>
        </div>

        <!-- SECTION 2 — Distribución por tipo -->
        <div v-if="summary && summary.eventsByType.length > 0">
          <h2 class="text-sm font-semibold mb-3 text-(--ui-text-muted) uppercase tracking-wider">
            {{ t('userEvents.sections.byType') }}
          </h2>
          <div class="flex flex-col gap-2">
            <div
              v-for="item in summary.eventsByType"
              :key="item.event_type"
              class="flex items-center gap-3"
            >
              <span class="text-sm w-40 flex-shrink-0">
                {{ eventTypeLabels[item.event_type] ?? item.event_type }}
              </span>
              <div class="bg-elevated rounded h-1.5 flex-1">
                <div
                  class="bg-primary/40 rounded h-full"
                  :style="{ width: (item.count / summary.eventsByType[0].count) * 100 + '%' }"
                />
              </div>
              <UBadge color="neutral" variant="subtle" size="xs">
                {{ item.count }}
              </UBadge>
            </div>
          </div>
        </div>

        <!-- SECTION 3 — Top búsquedas -->
        <div>
          <h2 class="text-sm font-semibold mb-3 text-(--ui-text-muted) uppercase tracking-wider">
            {{ t('userEvents.sections.topSearches') }}
          </h2>
          <p
            v-if="!summary || summary.topSearches.length === 0"
            class="text-sm text-(--ui-text-muted) text-center py-4"
          >
            {{ t('userEvents.emptySearches') }}
          </p>
          <ol v-else class="flex flex-col gap-2">
            <li
              v-for="(item, index) in summary.topSearches"
              :key="item.term"
              class="flex items-center gap-3"
            >
              <span class="text-xs text-(--ui-text-muted) w-5 text-right flex-shrink-0">
                {{ index + 1 }}
              </span>
              <span class="text-sm flex-1">{{ item.term }}</span>
              <UBadge color="neutral" variant="subtle" size="xs">
                {{ item.count }}
              </UBadge>
            </li>
          </ol>
        </div>

        <!-- SECTION 4 — Actividades más vistas -->
        <div>
          <h2 class="text-sm font-semibold mb-3 text-(--ui-text-muted) uppercase tracking-wider">
            {{ t('userEvents.sections.topActivities') }}
          </h2>
          <p
            v-if="!summary || summary.topActivities.length === 0"
            class="text-sm text-(--ui-text-muted) text-center py-4"
          >
            {{ t('userEvents.emptyActivities') }}
          </p>
          <ol v-else class="flex flex-col gap-2">
            <li
              v-for="(item, index) in summary.topActivities"
              :key="item.activity_id"
              class="flex items-center gap-3"
            >
              <span class="text-xs text-(--ui-text-muted) w-5 text-right flex-shrink-0">
                {{ index + 1 }}
              </span>
              <span class="text-sm flex-1">{{ item.title }}</span>
              <UBadge color="neutral" variant="subtle" size="xs">
                {{ item.count }}
              </UBadge>
            </li>
          </ol>
        </div>

        <!-- SECTION 5 — Eventos recientes -->
        <div>
          <h2 class="text-sm font-semibold mb-3 text-(--ui-text-muted) uppercase tracking-wider">
            {{ t('userEvents.sections.recentEvents') }}
          </h2>
          <UTable
            :data="summary?.recentEvents ?? []"
            :columns="columns"
            :loading="isLoading"
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
        </div>
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

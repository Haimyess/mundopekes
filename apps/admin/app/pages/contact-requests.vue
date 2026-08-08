<!-- app/pages/contact-requests.vue -->
<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { ContactRequest } from '~/composables/useContactRequests'
import { syncUrlPage } from '~/composables/useUrlPage'

const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

const { t } = useI18n()

const {
  requests,
  total,
  page,
  totalPages,
  isLoading,
  intent,
  status,
  feedbackStats,
  fetch: loadRequests,
  fetchFeedbackStats,
  updateStatus,
} = useContactRequests()

syncUrlPage(page)

const selectedRequest = ref<ContactRequest | null>(null)
const slideoverOpen = ref(false)

const formatDate = (date: string | null) => {
  if (!date) return '—'
  const d = new Date(date)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const intentEmoji: Record<string, string> = {
  outdated_activity: '🐛',
  feedback: '💬',
  provider_inquiry: '🏢',
  other: '💡',
}

const intentLabel = (i: string) =>
  ({
    outdated_activity: t('contactRequests.intent.outdated'),
    feedback: t('contactRequests.intent.feedback'),
    provider_inquiry: t('contactRequests.intent.provider'),
    other: t('contactRequests.intent.other'),
  })[i] ?? i

const statusColor = (s: string) =>
  ({
    pending: 'warning' as const,
    read: 'info' as const,
    resolved: 'success' as const,
  })[s] ?? 'neutral'

const statusLabel = (s: string) =>
  ({
    pending: t('contactRequests.status.pending'),
    read: t('contactRequests.status.read'),
    resolved: t('contactRequests.status.resolved'),
  })[s] ?? s

const tabs = computed(() => [
  { label: t('contactRequests.tabs.all'), value: undefined },
  { label: t('contactRequests.tabs.outdated'), value: 'outdated_activity' },
  { label: t('contactRequests.tabs.feedback'), value: 'feedback' },
  { label: t('contactRequests.tabs.provider'), value: 'provider_inquiry' },
  { label: t('contactRequests.tabs.other'), value: 'other' },
])

const statusOptions = computed(() => [
  { label: t('contactRequests.status.all'), value: undefined },
  { label: t('contactRequests.status.pending'), value: 'pending' },
  { label: t('contactRequests.status.read'), value: 'read' },
  { label: t('contactRequests.status.resolved'), value: 'resolved' },
])

const isFeedbackTab = computed(() => intent.value === 'feedback')

const openDetail = (row: ContactRequest) => {
  selectedRequest.value = row
  slideoverOpen.value = true
}

const getActionItems = (row: ContactRequest): DropdownMenuItem[][] => [
  [
    {
      label: t('contactRequests.actions.viewDetail'),
      icon: 'i-lucide-eye',
      onSelect: () => openDetail(row),
    },
    {
      label: t('contactRequests.actions.markRead'),
      icon: 'i-lucide-eye',
      onSelect: () => updateStatus(row.id, 'read'),
    },
    {
      label: t('contactRequests.actions.markResolved'),
      icon: 'i-lucide-check-circle',
      onSelect: () => updateStatus(row.id, 'resolved'),
    },
    {
      label: t('contactRequests.actions.markPending'),
      icon: 'i-lucide-clock',
      onSelect: () => updateStatus(row.id, 'pending'),
    },
  ],
]

const columns = computed<TableColumn<ContactRequest>[]>(() => [
  {
    accessorKey: 'created_at',
    header: t('contactRequests.columns.date'),
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-xs text-(--ui-text-muted) whitespace-nowrap' },
        formatDate(row.original.created_at)
      ),
  },
  {
    accessorKey: 'intent',
    header: t('contactRequests.columns.intent'),
    cell: ({ row }) =>
      h(
        UBadge,
        { color: 'neutral', variant: 'subtle', size: 'sm' },
        () => `${intentEmoji[row.original.intent] ?? ''} ${intentLabel(row.original.intent)}`
      ),
  },
  {
    id: 'contact',
    header: t('contactRequests.columns.contact'),
    cell: ({ row }) =>
      h('div', { class: 'flex flex-col gap-0.5' }, [
        h('span', { class: 'text-sm font-medium' }, row.original.name),
        h('span', { class: 'text-xs text-(--ui-text-muted)' }, row.original.email),
      ]),
  },
  {
    accessorKey: 'activity_title',
    header: t('contactRequests.columns.activity'),
    cell: ({ row }) => h('span', { class: 'text-sm' }, row.original.activity_title ?? '—'),
  },
  {
    accessorKey: 'message',
    header: t('contactRequests.columns.message'),
    cell: ({ row }) => {
      const msg = row.original.message
      const truncated = msg.length > 50 ? msg.slice(0, 50) + '…' : msg
      return h(
        'span',
        {
          class: 'text-sm cursor-pointer hover:text-primary',
          title: msg,
          onClick: () => openDetail(row.original),
        },
        truncated
      )
    },
  },
  {
    accessorKey: 'status',
    header: t('contactRequests.columns.status'),
    cell: ({ row }) =>
      h(UBadge, { color: statusColor(row.original.status), variant: 'subtle', size: 'sm' }, () =>
        statusLabel(row.original.status)
      ),
  },
  {
    id: 'actions',
    cell: ({ row }) =>
      h(
        UDropdownMenu,
        { items: getActionItems(row.original) },
        {
          default: () =>
            h(UButton, {
              icon: 'i-lucide-more-horizontal',
              color: 'neutral',
              variant: 'ghost',
              size: 'xs',
            }),
        }
      ),
  },
])

// Sequential, not Promise.all — two parallel authenticated requests on first
// load can race Supabase's refresh-token rotation when the token is near
// expiry (whichever loses gets 401 on an already-consumed refresh token).
// See activities/index.vue for the full explanation.
await loadRequests()
await fetchFeedbackStats()
</script>

<template>
  <UDashboardPanel :ui="{ body: 'flex flex-col flex-1 overflow-hidden p-0 gap-0' }">
    <template #header>
      <UDashboardNavbar :title="t('contactRequests.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge color="neutral" variant="subtle">
            {{ t('contactRequests.totalBadge', { total }) }}
          </UBadge>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="isLoading"
            @click="loadRequests"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Zona fija: paneles + tabs + filtros, nunca scrollea -->
      <div class="shrink-0 border-b border-default">
        <!-- Feedback Analytics Panel -->
        <Transition name="fade">
          <div
            v-if="isFeedbackTab && feedbackStats"
            class="mx-4 mt-4 p-4 rounded-xl border border-default bg-elevated flex flex-col gap-4"
          >
            <h3 class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">
              {{ t('contactRequests.analytics.title') }}
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="flex flex-col gap-0.5">
                <span class="text-xs text-(--ui-text-muted)">{{
                  t('contactRequests.analytics.total')
                }}</span>
                <span class="text-2xl font-bold">{{ feedbackStats.total }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-xs text-(--ui-text-muted)">{{
                  t('contactRequests.analytics.thisMonth')
                }}</span>
                <span class="text-2xl font-bold text-primary">{{ feedbackStats.thisMonth }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-xs text-(--ui-text-muted)">{{
                  t('contactRequests.analytics.pending')
                }}</span>
                <span class="text-2xl font-bold text-warning-500">{{ feedbackStats.pending }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-xs text-(--ui-text-muted)">{{
                  t('contactRequests.analytics.resolved')
                }}</span>
                <span class="text-2xl font-bold text-success-500">{{
                  feedbackStats.resolved
                }}</span>
              </div>
            </div>
            <ContactFeedbackBarChart
              v-if="feedbackStats.byMonth.length"
              :data="feedbackStats.byMonth"
            />
          </div>
        </Transition>

        <!-- Provider tab banner -->
        <Transition name="fade">
          <div
            v-if="intent === 'provider_inquiry'"
            class="mx-4 mt-4 p-4 rounded-xl border border-default bg-elevated flex items-center gap-4"
          >
            <UIcon name="i-lucide-store" class="size-5 text-(--ui-text-muted) flex-shrink-0" />
            <div class="flex-1 text-sm text-(--ui-text-muted)">
              {{ t('contactRequests.providerBanner.text') }}
            </div>
            <UButton
              size="sm"
              color="primary"
              variant="outline"
              icon="i-lucide-arrow-right"
              trailing
              @click="navigateTo('/providers')"
            >
              {{ t('contactRequests.providerBanner.button') }}
            </UButton>
          </div>
        </Transition>

        <!-- Intent Tabs -->
        <div class="flex gap-1 px-4 pt-4 flex-wrap">
          <button
            v-for="tab in tabs"
            :key="tab.value ?? 'all'"
            class="px-3 py-1.5 text-sm rounded-lg transition-colors"
            :class="
              intent === tab.value
                ? 'bg-primary text-white font-medium'
                : 'text-(--ui-text-muted) hover:bg-elevated'
            "
            @click="intent = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Status Filter -->
        <div class="flex gap-3 px-4 py-3 flex-wrap">
          <USelect
            v-model="status"
            :items="statusOptions"
            value-key="value"
            label-key="label"
            :placeholder="t('contactRequests.statusPlaceholder')"
            class="w-44"
          />
        </div>
      </div>

      <!-- Zona scrolleable: solo la tabla -->
      <div class="flex-1 min-h-0 overflow-y-auto p-4">
        <UTable
          :data="requests"
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

      <!-- Zona fija: paginación, siempre visible abajo -->
      <div v-if="totalPages > 1" class="shrink-0 flex justify-center p-4 border-t border-default">
        <UPagination v-model:page="page" :total="total" :items-per-page="20" />
      </div>
    </template>
  </UDashboardPanel>

  <ContactRequestSlideover v-model:open="slideoverOpen" :request="selectedRequest" />
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

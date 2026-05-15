<!-- app/pages/contact-requests.vue -->
<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { ContactRequest } from '~/composables/useContactRequests'

const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

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

const intentLabel: Record<string, string> = {
  outdated_activity: 'Desactualizado',
  feedback: 'Feedback',
  provider_inquiry: 'Proveedor',
  other: 'Otro',
}

const statusColor = (s: string) =>
  ({
    pending: 'warning' as const,
    read: 'info' as const,
    resolved: 'success' as const,
  })[s] ?? 'neutral'

const statusLabel = (s: string) =>
  ({
    pending: 'Pendiente',
    read: 'Leído',
    resolved: 'Resuelto',
  })[s] ?? s

const tabs = [
  { label: 'Todos', value: undefined },
  { label: '🐛 Desactualizado', value: 'outdated_activity' },
  { label: '💬 Feedback', value: 'feedback' },
  { label: '🏢 Proveedor', value: 'provider_inquiry' },
  { label: '💡 Otro', value: 'other' },
]

const statusOptions = [
  { label: 'Todos', value: undefined },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Leído', value: 'read' },
  { label: 'Resuelto', value: 'resolved' },
]

const isFeedbackTab = computed(() => intent.value === 'feedback')

const openDetail = (row: ContactRequest) => {
  selectedRequest.value = row
  slideoverOpen.value = true
}

const getActionItems = (row: ContactRequest): DropdownMenuItem[][] => [
  [
    {
      label: 'Ver detalle',
      icon: 'i-lucide-eye',
      onSelect: () => openDetail(row),
    },
    {
      label: 'Marcar como leído',
      icon: 'i-lucide-eye',
      onSelect: () => updateStatus(row.id, 'read'),
    },
    {
      label: 'Marcar como resuelto',
      icon: 'i-lucide-check-circle',
      onSelect: () => updateStatus(row.id, 'resolved'),
    },
    {
      label: 'Marcar como pendiente',
      icon: 'i-lucide-clock',
      onSelect: () => updateStatus(row.id, 'pending'),
    },
  ],
]

const columns: TableColumn<ContactRequest>[] = [
  {
    accessorKey: 'created_at',
    header: 'Fecha',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-xs text-(--ui-text-muted) whitespace-nowrap' },
        formatDate(row.original.created_at)
      ),
  },
  {
    accessorKey: 'intent',
    header: 'Intent',
    cell: ({ row }) =>
      h(
        UBadge,
        { color: 'neutral', variant: 'subtle', size: 'sm' },
        () =>
          `${intentEmoji[row.original.intent] ?? ''} ${intentLabel[row.original.intent] ?? row.original.intent}`
      ),
  },
  {
    id: 'contact',
    header: 'Contacto',
    cell: ({ row }) =>
      h('div', { class: 'flex flex-col gap-0.5' }, [
        h('span', { class: 'text-sm font-medium' }, row.original.name),
        h('span', { class: 'text-xs text-(--ui-text-muted)' }, row.original.email),
      ]),
  },
  {
    accessorKey: 'activity_title',
    header: 'Actividad',
    cell: ({ row }) => h('span', { class: 'text-sm' }, row.original.activity_title ?? '—'),
  },
  {
    accessorKey: 'message',
    header: 'Mensaje',
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
    header: 'Estado',
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
]

await Promise.all([loadRequests(), fetchFeedbackStats()])
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Consultas de contacto">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge color="neutral" variant="subtle"> {{ total }} consultas </UBadge>
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
      <!-- Feedback Analytics Panel -->
      <Transition name="fade">
        <div
          v-if="isFeedbackTab && feedbackStats"
          class="mx-4 mt-4 p-4 rounded-xl border border-default bg-elevated flex flex-col gap-4"
        >
          <h3 class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">
            Analytics de Feedback
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-(--ui-text-muted)">Total</span>
              <span class="text-2xl font-bold">{{ feedbackStats.total }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-(--ui-text-muted)">Este mes</span>
              <span class="text-2xl font-bold text-primary">{{ feedbackStats.thisMonth }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-(--ui-text-muted)">Pendientes</span>
              <span class="text-2xl font-bold text-warning-500">{{ feedbackStats.pending }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-(--ui-text-muted)">Resueltos</span>
              <span class="text-2xl font-bold text-success-500">{{ feedbackStats.resolved }}</span>
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
            Los registros completos de proveedores se gestionan en la página de Proveedores
          </div>
          <UButton
            size="sm"
            color="primary"
            variant="outline"
            icon="i-lucide-arrow-right"
            trailing
            @click="navigateTo('/providers')"
          >
            Ir a Proveedores
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
      <div class="flex gap-3 px-4 pt-3 flex-wrap">
        <USelect
          v-model="status"
          :items="statusOptions"
          value-key="value"
          label-key="label"
          placeholder="Estado"
          class="w-44"
        />
      </div>

      <!-- Tabla -->
      <div class="p-4">
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

      <!-- Paginación -->
      <div v-if="totalPages > 1" class="flex justify-center pb-4">
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

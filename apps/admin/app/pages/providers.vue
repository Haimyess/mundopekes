<!-- app/pages/providers.vue -->
<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { Provider } from '~/composables/useProviders'
import { syncUrlPage } from '~/composables/useUrlPage'

const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

const { t } = useI18n()

const {
  providers,
  total,
  page,
  totalPages,
  isLoading,
  status,
  selectedProvider,
  fetch: loadProviders,
  updateStatus,
} = useProviders()

syncUrlPage(page)

const slideoverOpen = ref(false)
const notesInput = ref('')

const formatDate = (date: string) => {
  const d = new Date(date)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const statusColor = (s: string) =>
  ({
    pending: 'warning' as const,
    active: 'success' as const,
    suspended: 'error' as const,
    rejected: 'neutral' as const,
  })[s] ?? 'neutral'

const statusLabel = (s: string) =>
  ({
    pending: t('providers.status.pending'),
    active: t('providers.status.active'),
    suspended: t('providers.status.suspended'),
    rejected: t('providers.status.rejected'),
  })[s] ?? s

const tabs = computed(() => [
  { label: t('providers.tabs.pending'), value: 'pending' },
  { label: t('providers.tabs.active'), value: 'active' },
  { label: t('providers.tabs.suspended'), value: 'suspended' },
  { label: t('providers.tabs.rejected'), value: 'rejected' },
  { label: t('providers.tabs.all'), value: 'all' },
])

const openDetail = (provider: Provider) => {
  selectedProvider.value = provider
  notesInput.value = provider.notes ?? ''
  slideoverOpen.value = true
}

const handleUpdateStatus = async (
  id: string,
  newStatus: 'active' | 'suspended' | 'rejected',
  notes?: string
) => {
  await updateStatus(id, newStatus, notes)
  slideoverOpen.value = false
}

const getActionItems = (row: Provider): DropdownMenuItem[][] => {
  const items: DropdownMenuItem[] = [
    {
      label: t('providers.actions.viewDetail'),
      icon: 'i-lucide-eye',
      onSelect: () => openDetail(row),
    },
  ]
  if (row.status === 'pending' || row.status === 'suspended') {
    items.push({
      label: t('providers.actions.approve'),
      icon: 'i-lucide-check-circle',
      onSelect: () => updateStatus(row.id, 'active'),
    })
  }
  if (row.status === 'active') {
    items.push({
      label: t('providers.actions.suspend'),
      icon: 'i-lucide-pause-circle',
      onSelect: () => updateStatus(row.id, 'suspended'),
    })
  }
  if (row.status === 'pending') {
    items.push({
      label: t('providers.actions.reject'),
      icon: 'i-lucide-x-circle',
      onSelect: () => openDetail(row),
    })
  }
  return [items]
}

const scheduleEntries = computed(() => {
  if (!selectedProvider.value) return []
  const s = selectedProvider.value.schedule as Record<
    string,
    { open?: string; close?: string; closed?: boolean }
  >
  if (!s || typeof s !== 'object') return []
  const dayLabels: Record<string, string> = {
    sunday: t('providers.dayLabels.sunday'),
    monday: t('providers.dayLabels.monday'),
    tuesday: t('providers.dayLabels.tuesday'),
    wednesday: t('providers.dayLabels.wednesday'),
    thursday: t('providers.dayLabels.thursday'),
    friday: t('providers.dayLabels.friday'),
    saturday: t('providers.dayLabels.saturday'),
  }
  return Object.entries(s).map(([day, val]) => ({
    day: dayLabels[day] ?? day,
    open: val.open ?? '',
    close: val.close ?? '',
    closed: val.closed ?? false,
  }))
})

const priceRange = computed(() => {
  if (!selectedProvider.value) return null
  const p = selectedProvider.value.price_range as {
    from?: number
    to?: number
    currency?: string
  } | null
  if (!p || (!p.from && !p.to)) return null
  return p
})

const metadataCity = computed(() => {
  if (!selectedProvider.value) return null
  const m = selectedProvider.value.metadata as { city?: string } | null
  return m?.city ?? null
})

const columns = computed<TableColumn<Provider>[]>(() => [
  {
    accessorKey: 'created_at',
    header: t('providers.columns.date'),
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-xs text-(--ui-text-muted) whitespace-nowrap' },
        formatDate(row.original.created_at)
      ),
  },
  {
    id: 'business',
    header: t('providers.columns.business'),
    cell: ({ row }) =>
      h('div', { class: 'flex flex-col gap-0.5' }, [
        h('span', { class: 'text-sm font-medium' }, row.original.name),
        h('span', { class: 'text-xs text-(--ui-text-muted)' }, row.original.email),
        row.original.phone
          ? h('span', { class: 'text-xs text-(--ui-text-muted)' }, row.original.phone)
          : null,
      ]),
  },
  {
    accessorKey: 'activity_types',
    header: t('providers.columns.activities'),
    cell: ({ row }) => {
      const types = row.original.activity_types ?? []
      const visible = types.slice(0, 2)
      const rest = types.length - 2
      return h('div', { class: 'flex flex-wrap gap-1' }, [
        ...visible.map((t: string) =>
          h(UBadge, { color: 'neutral', variant: 'subtle', size: 'xs' }, () => t)
        ),
        rest > 0
          ? h(UBadge, { color: 'neutral', variant: 'subtle', size: 'xs' }, () => `+${rest}`)
          : null,
      ])
    },
  },
  {
    id: 'location',
    header: t('providers.columns.city'),
    cell: ({ row }) => {
      const m = row.original.metadata as { city?: string } | null
      return h('span', { class: 'text-sm' }, m?.city ?? '—')
    },
  },
  {
    accessorKey: 'status',
    header: t('providers.columns.status'),
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

// Carga inicial no bloqueante — la navegación a esta página no espera a
// nada de esto (ver TableSkeleton en el template mientras `isLoading` es
// true y todavía no hay datos).
onMounted(() => {
  loadProviders()
})
</script>

<template>
  <UDashboardPanel :ui="{ body: 'flex flex-col flex-1 overflow-hidden p-0 gap-0' }">
    <template #header>
      <UDashboardNavbar :title="t('providers.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge color="neutral" variant="subtle">
            {{ total }} {{ t('providers.recordsBadge') }}
          </UBadge>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="isLoading"
            @click="loadProviders"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <TableSkeleton v-if="isLoading && !providers.length" :tabs="5" :filters="0" :columns="5" />

      <template v-else>
        <!-- Zona fija: tabs, nunca scrollea -->
        <div class="shrink-0 flex gap-1 p-4 flex-wrap border-b border-default">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="px-3 py-1.5 text-sm rounded-lg transition-colors"
            :class="
              status === tab.value
                ? 'bg-primary text-white font-medium'
                : 'text-(--ui-text-muted) hover:bg-elevated'
            "
            @click="status = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Zona scrolleable: solo la tabla -->
        <div class="flex-1 min-h-0 overflow-y-auto p-4">
          <UTable
            :data="providers"
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
    </template>
  </UDashboardPanel>

  <!-- Slideover detalle -->
  <USlideover
    v-model:open="slideoverOpen"
    :title="selectedProvider?.name ?? t('providers.slideoverFallbackTitle')"
  >
    <template #body>
      <div v-if="selectedProvider" class="flex flex-col gap-5 p-1">
        <!-- Status badge -->
        <div class="flex items-center gap-2">
          <UBadge :color="statusColor(selectedProvider.status)" variant="subtle">
            {{ statusLabel(selectedProvider.status) }}
          </UBadge>
          <span class="text-xs text-(--ui-text-muted) ml-auto">{{
            formatDate(selectedProvider.created_at)
          }}</span>
        </div>

        <!-- Contacto -->
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">{{
            t('providers.sections.contact')
          }}</span>
          <span class="text-sm font-medium">{{ selectedProvider.email }}</span>
          <span v-if="selectedProvider.phone" class="text-sm text-(--ui-text-muted)">{{
            selectedProvider.phone
          }}</span>
          <a
            v-if="selectedProvider.website"
            :href="selectedProvider.website"
            target="_blank"
            class="text-sm text-primary"
            >{{ selectedProvider.website }}</a
          >
        </div>

        <!-- Descripción -->
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">{{
            t('providers.sections.description')
          }}</span>
          <p class="text-sm leading-relaxed">
            {{ selectedProvider.description }}
          </p>
        </div>

        <!-- Tipos -->
        <div class="flex flex-col gap-2">
          <span class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">{{
            t('providers.sections.activityTypes')
          }}</span>
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="type in selectedProvider.activity_types"
              :key="type"
              color="primary"
              variant="subtle"
              size="sm"
            >
              {{ type }}
            </UBadge>
          </div>
        </div>

        <!-- Ubicación -->
        <div v-if="selectedProvider.address || metadataCity" class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">{{
            t('providers.sections.location')
          }}</span>
          <span v-if="metadataCity" class="text-sm">{{ metadataCity }}</span>
          <span v-if="selectedProvider.address" class="text-sm text-(--ui-text-muted)">{{
            selectedProvider.address
          }}</span>
        </div>

        <!-- Horarios -->
        <div v-if="scheduleEntries.length" class="flex flex-col gap-2">
          <span class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">{{
            t('providers.sections.schedule')
          }}</span>
          <div class="flex flex-col gap-1">
            <div
              v-for="entry in scheduleEntries"
              :key="entry.day"
              class="flex items-center gap-3 text-sm"
            >
              <span class="w-8 font-medium text-(--ui-text-muted)">{{ entry.day }}</span>
              <span v-if="entry.closed" class="text-(--ui-text-muted)">{{
                t('providers.closed')
              }}</span>
              <span v-else>{{ entry.open }} – {{ entry.close }}</span>
            </div>
          </div>
        </div>

        <!-- Precios -->
        <div v-if="priceRange" class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">{{
            t('providers.sections.prices')
          }}</span>
          <span class="text-sm">
            {{ priceRange.from ?? '?' }} – {{ priceRange.to ?? '?' }}
            {{ priceRange.currency ?? 'ILS' }}
          </span>
        </div>

        <!-- Notas internas -->
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">{{
            t('providers.sections.internalNotes')
          }}</span>
          <textarea
            v-model="notesInput"
            class="w-full text-sm border border-default rounded-lg p-2 bg-elevated resize-none"
            rows="3"
            :placeholder="t('providers.notesPlaceholder')"
          />
        </div>

        <!-- Acciones -->
        <div class="flex flex-col gap-2 pt-2">
          <UButton
            v-if="selectedProvider.status === 'pending' || selectedProvider.status === 'suspended'"
            color="success"
            icon="i-lucide-check-circle"
            @click="handleUpdateStatus(selectedProvider.id, 'active', notesInput)"
          >
            {{ t('providers.buttons.approveProvider') }}
          </UButton>
          <UButton
            v-if="selectedProvider.status === 'active'"
            color="warning"
            variant="outline"
            icon="i-lucide-pause-circle"
            @click="handleUpdateStatus(selectedProvider.id, 'suspended', notesInput)"
          >
            {{ t('providers.actions.suspend') }}
          </UButton>
          <UButton
            v-if="selectedProvider.status === 'pending'"
            color="error"
            variant="outline"
            icon="i-lucide-x-circle"
            @click="handleUpdateStatus(selectedProvider.id, 'rejected', notesInput)"
          >
            {{ t('providers.actions.reject') }}
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<!-- app/pages/suggestions.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Suggestion } from '~/composables/useSuggestions'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')

const {
  suggestions,
  loading,
  statusFilter,
  fetch: loadSuggestions,
} = useSuggestions()

const selected = ref<Suggestion | null>(null)
const slideoverOpen = ref(false)

const openSuggestion = (suggestion: Suggestion) => {
  selected.value = suggestion
  slideoverOpen.value = true
}

// const onClose = () => {
//   slideoverOpen.value = false
//   selected.value = null
// }

const onClose = () => {
  slideoverOpen.value = false
  setTimeout(() => { selected.value = null }, 300)
}

const onAction = async () => {
  await loadSuggestions()
}

// Tabs de filtro
const tabs = [
  { label: 'Pendientes', value: 'pending', icon: 'i-lucide-clock' },
  { label: 'Aprobadas', value: 'approved', icon: 'i-lucide-check-circle' },
  { label: 'Rechazadas', value: 'rejected', icon: 'i-lucide-x-circle' },
  { label: 'Todas', value: 'all', icon: 'i-lucide-list' },
]

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

const statusColor = (status: string) => ({
  pending: 'warning' as const,
  approved: 'success' as const,
  rejected: 'error' as const,
}[status] ?? 'neutral')

const statusLabel = (status: string) => ({
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}[status] ?? status)

const columns: TableColumn<Suggestion>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
  },
  {
    accessorKey: 'location',
    header: 'Ciudad',
    cell: ({ row }) => row.original.location?.city ?? '—',
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
      const types = row.original.type ?? []
      return h('div', { class: 'flex gap-1 flex-wrap' }, [
        ...types.slice(0, 2).map((t: string) =>
          h(UBadge, { key: t, color: 'neutral', variant: 'subtle', size: 'xs' }, () => t),
        ),
        types.length > 2
          ? h('span', { class: 'text-xs text-(--ui-text-muted)' }, `+${types.length - 2}`)
          : null,
      ])
    },
  },
  {
    accessorKey: 'is_free',
    header: 'Gratuito',
    cell: ({ row }) => h(UIcon, {
      name: row.original.is_free ? 'i-lucide-check' : 'i-lucide-minus',
      class: row.original.is_free ? 'text-success-500' : 'text-(--ui-text-muted)',
    }),
  },
  {
    accessorKey: 'created_at',
    header: 'Fecha',
    cell: ({ row }) => h('span', { class: 'text-sm text-(--ui-text-muted)' }, formatDate(row.original.created_at)),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => h(UBadge, {
      color: statusColor(row.original.status),
      variant: 'subtle',
      size: 'sm',
    }, () => statusLabel(row.original.status)),
  },
  {
    id: 'actions',
    cell: ({ row }) => h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      icon: 'i-lucide-eye',
      size: 'xs',
      onClick: (e: MouseEvent) => {
        e.stopPropagation()
        openSuggestion(row.original)
      },
    }),
  },
]

await loadSuggestions()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Sugerencias">
        <template #right>
          <UBadge color="warning" variant="subtle">
            {{ suggestions.filter(s => s.status === 'pending').length }} pendientes
          </UBadge>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Tabs de filtro -->
      <div class="px-4 pt-4">
        <div class="flex gap-2 flex-wrap">
          <UButton
            v-for="tab in tabs"
            :key="tab.value"
            :color="statusFilter === tab.value ? 'primary' : 'neutral'"
            :variant="statusFilter === tab.value ? 'solid' : 'outline'"
            :icon="tab.icon"
            size="sm"
            @click="statusFilter = tab.value as any"
          >
            {{ tab.label }}
          </UButton>
        </div>
      </div>

      <!-- Tabla -->
      <div class="p-4">
        <UTable
          :data="suggestions"
          :columns="columns"
          :loading="loading"
          class="w-full"
          :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
            tbody: '[&>tr]:last:[&>td]:border-b-0 [&>tr]:hover:bg-elevated/50 [&>tr]:cursor-pointer [&>tr]:transition-colors',
            th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
            td: 'border-b border-default',
          }"
        />
      </div>
    </template>
  </UDashboardPanel>

  <!-- Slideover detalle -->
  <!-- <SuggestionsSlideover
    v-if="slideoverOpen"
    :suggestion="selected"
    @approved="onAction"
    @rejected="onAction"
    @deleted="onAction"
    @close="onClose"
  /> -->
  <SuggestionsSlideover
  :open="slideoverOpen"
  :suggestion="selected"
  @approved="onAction"
  @rejected="onAction"
  @close="onClose"
/>
</template>

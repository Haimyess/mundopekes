<!-- app/pages/logs.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AppLog } from '~/composables/useLogs'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const {
  logs,
  total,
  page,
  totalPages,
  isLoading,
  errorsLast24h,
  level,
  context,
  fetch: loadLogs,
  fetchErrorCount,
} = useLogs()

const contexts = ref<string[]>([])
const metadataModal = ref(false)
const selectedMetadata = ref<unknown>(null)

const formatDate = (date: string | null) => {
  if (!date) return '—'
  const d = new Date(date)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const levelColor = (lvl: string) =>
  ({
    error: 'error' as const,
    warn: 'warning' as const,
    info: 'info' as const,
  })[lvl] ?? 'neutral'

const levelOptions = [
  { label: 'Todos los niveles', value: undefined },
  { label: 'Error', value: 'error' },
  { label: 'Warn', value: 'warn' },
  { label: 'Info', value: 'info' },
]

const contextOptions = computed(() => [
  { label: 'Todos los contextos', value: undefined },
  ...contexts.value.map((c) => ({ label: c, value: c })),
])

const openMetadata = (metadata: unknown) => {
  selectedMetadata.value = metadata
  metadataModal.value = true
}

const columns: TableColumn<AppLog>[] = [
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
    accessorKey: 'level',
    header: 'Nivel',
    cell: ({ row }) =>
      h(
        UBadge,
        {
          color: levelColor(row.original.level),
          variant: 'subtle',
          size: 'xs',
        },
        () => row.original.level.toUpperCase()
      ),
  },
  {
    accessorKey: 'context',
    header: 'Contexto',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, row.original.context),
  },
  {
    accessorKey: 'message',
    header: 'Mensaje',
    cell: ({ row }) => {
      const msg = row.original.message
      const truncated = msg.length > 60 ? msg.slice(0, 60) + '…' : msg
      return h('span', { class: 'text-sm', title: msg }, truncated)
    },
  },
  {
    id: 'metadata',
    header: 'Metadata',
    cell: ({ row }) => {
      if (!row.original.metadata) return h('span', { class: 'text-(--ui-text-muted) text-xs' }, '—')
      return h(
        UButton,
        {
          size: 'xs',
          color: 'neutral',
          variant: 'outline',
          onClick: () => openMetadata(row.original.metadata),
        },
        () => 'Ver'
      )
    },
  },
]

onMounted(async () => {
  const ctxList = await $fetch<string[]>('/api/logs/contexts')
  contexts.value = ctxList
  await Promise.all([loadLogs(), fetchErrorCount()])
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Logs del sistema">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge color="neutral" variant="subtle"> {{ total }} registros </UBadge>
          <UBadge v-if="errorsLast24h > 0" color="error" variant="subtle">
            {{ errorsLast24h }} errores (24h)
          </UBadge>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="isLoading"
            @click="loadLogs"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Filtros -->
      <div class="flex gap-3 px-4 pt-4 flex-wrap">
        <USelect
          v-model="level"
          :items="levelOptions"
          value-key="value"
          label-key="label"
          placeholder="Nivel"
          class="w-48"
        />
        <USelect
          v-model="context"
          :items="contextOptions"
          value-key="value"
          label-key="label"
          placeholder="Contexto"
          class="w-56"
        />
      </div>

      <!-- Tabla -->
      <div class="p-4">
        <UTable
          :data="logs"
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
        <UPagination v-model:page="page" :total="total" :items-per-page="50" />
      </div>
    </template>
  </UDashboardPanel>

  <!-- Modal metadata -->
  <UModal v-model:open="metadataModal" title="Metadata del log">
    <template #body>
      <pre class="text-xs overflow-auto max-h-96 bg-elevated rounded p-3">{{
        JSON.stringify(selectedMetadata, null, 2)
      }}</pre>
    </template>
  </UModal>
</template>

<!-- app/pages/logs.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AppLog } from '~/composables/useLogs'
import { syncUrlPage } from '~/composables/useUrlPage'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const { t } = useI18n()

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

syncUrlPage(page)

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

const levelOptions = computed(() => [
  { label: t('systemLogs.filters.allLevels'), value: undefined },
  { label: t('systemLogs.levels.error'), value: 'error' },
  { label: t('systemLogs.levels.warn'), value: 'warn' },
  { label: t('systemLogs.levels.info'), value: 'info' },
])

const contextOptions = computed(() => [
  { label: t('systemLogs.filters.allContexts'), value: undefined },
  ...contexts.value.map((c) => ({ label: c, value: c })),
])

const openMetadata = (metadata: unknown) => {
  selectedMetadata.value = metadata
  metadataModal.value = true
}

const columns = computed<TableColumn<AppLog>[]>(() => [
  {
    accessorKey: 'created_at',
    header: t('systemLogs.columns.date'),
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-xs text-(--ui-text-muted) whitespace-nowrap' },
        formatDate(row.original.created_at)
      ),
  },
  {
    accessorKey: 'level',
    header: t('systemLogs.columns.level'),
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
    header: t('systemLogs.columns.context'),
    cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, row.original.context),
  },
  {
    accessorKey: 'message',
    header: t('systemLogs.columns.message'),
    cell: ({ row }) => {
      const msg = row.original.message
      const truncated = msg.length > 60 ? msg.slice(0, 60) + '…' : msg
      return h('span', { class: 'text-sm', title: msg }, truncated)
    },
  },
  {
    id: 'metadata',
    header: t('systemLogs.columns.metadata'),
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
        () => t('systemLogs.view')
      )
    },
  },
])

onMounted(async () => {
  const ctxList = await $fetch<string[]>('/api/logs/contexts')
  contexts.value = ctxList
  await Promise.all([loadLogs(), fetchErrorCount()])
})
</script>

<template>
  <UDashboardPanel :ui="{ body: 'flex flex-col flex-1 overflow-hidden p-0 gap-0' }">
    <template #header>
      <UDashboardNavbar :title="t('systemLogs.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge color="neutral" variant="subtle">
            {{ t('systemLogs.recordsCount', { count: total }) }}
          </UBadge>
          <UBadge v-if="errorsLast24h > 0" color="error" variant="subtle">
            {{ t('systemLogs.errorsLast24h', { count: errorsLast24h }) }}
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
      <!-- Zona fija: filtros, nunca scrollea -->
      <div class="shrink-0 flex gap-3 p-4 flex-wrap border-b border-default">
        <USelect
          v-model="level"
          :items="levelOptions"
          value-key="value"
          label-key="label"
          :placeholder="t('systemLogs.filters.levelPlaceholder')"
          class="w-48"
        />
        <USelect
          v-model="context"
          :items="contextOptions"
          value-key="value"
          label-key="label"
          :placeholder="t('systemLogs.filters.contextPlaceholder')"
          class="w-56"
        />
      </div>

      <!-- Zona scrolleable: solo la tabla -->
      <div class="flex-1 min-h-0 overflow-y-auto p-4">
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

      <!-- Zona fija: paginación, siempre visible abajo -->
      <div v-if="totalPages > 1" class="shrink-0 flex justify-center p-4 border-t border-default">
        <UPagination v-model:page="page" :total="total" :items-per-page="50" />
      </div>
    </template>
  </UDashboardPanel>

  <!-- Modal metadata -->
  <UModal v-model:open="metadataModal" :title="t('systemLogs.metadataModalTitle')">
    <template #body>
      <pre class="text-xs overflow-auto max-h-96 bg-elevated rounded p-3">{{
        JSON.stringify(selectedMetadata, null, 2)
      }}</pre>
    </template>
  </UModal>
</template>

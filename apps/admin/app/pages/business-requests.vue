<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import {
  BUSINESS_REQUEST_KINDS,
  BUSINESS_REQUEST_STATUSES,
  type BusinessRequestStatus,
} from '@mundopekes/schemas'
import type { BusinessRequestRow } from '~/composables/useBusinessRequests'
import { BUSINESS_REQUESTS_PAGE_SIZE } from '~/composables/useBusinessRequests'
import { syncUrlPage, syncUrlParam } from '~/composables/useUrlPage'

defineOptions({ name: 'BusinessRequestsPage' })

const UBadge = resolveComponent('UBadge')

const STATUS_COLORS: Record<string, 'warning' | 'info' | 'success' | 'neutral'> = {
  pending: 'warning',
  contacted: 'info',
  approved: 'success',
  rejected: 'neutral',
}

const { t } = useI18n()
const {
  requests,
  total,
  page,
  totalPages,
  isLoading,
  isSaving,
  kind,
  status,
  fetch: loadRequests,
  update,
} = useBusinessRequests()

syncUrlPage(page)
syncUrlParam(kind as unknown as Ref<string>, 'kind')
syncUrlParam(status as unknown as Ref<string>, 'status')

const selectedRequest = ref<BusinessRequestRow | null>(null)
const isSlideoverOpen = ref(false)

const kindTabs = computed(() => [
  { label: t('businessRequests.kinds.all'), value: undefined },
  ...BUSINESS_REQUEST_KINDS.map((value) => ({
    label: t(`businessRequests.kinds.${value}`),
    value,
  })),
])

const statusOptions = computed(() => [
  { label: t('businessRequests.status.all'), value: undefined },
  ...BUSINESS_REQUEST_STATUSES.map((value) => ({
    label: t(`businessRequests.status.${value}`),
    value,
  })),
])

const formatDate = (value: string) => new Date(value).toLocaleDateString('es-AR')

const handleOpen = (request: BusinessRequestRow) => {
  selectedRequest.value = request
  isSlideoverOpen.value = true
}

const handleSave = async (id: string, nextStatus: BusinessRequestStatus, notes: string) => {
  const updated = await update(id, nextStatus, notes)
  if (updated) selectedRequest.value = updated
}

const columns = computed<TableColumn<BusinessRequestRow>[]>(() => [
  {
    accessorKey: 'created_at',
    header: t('businessRequests.columns.date'),
    cell: ({ row }) =>
      h('span', { class: 'text-xs text-(--ui-text-muted)' }, formatDate(row.original.created_at)),
  },
  {
    accessorKey: 'kind',
    header: t('businessRequests.columns.kind'),
    cell: ({ row }) =>
      h(
        UBadge,
        {
          color: row.original.kind === 'claim' ? 'info' : 'primary',
          variant: 'subtle',
          size: 'sm',
        },
        () => t(`businessRequests.kinds.${row.original.kind}`)
      ),
  },
  {
    accessorKey: 'business_name',
    header: t('businessRequests.columns.business'),
    cell: ({ row }) =>
      h(
        'button',
        {
          type: 'button',
          class: 'text-sm font-medium text-start hover:text-(--ui-primary)',
          onClick: () => handleOpen(row.original),
        },
        row.original.business_name
      ),
  },
  {
    id: 'contact',
    header: t('businessRequests.columns.contact'),
    cell: ({ row }) =>
      h('div', { class: 'flex flex-col gap-0.5 text-sm' }, [
        h('span', row.original.contact_name ?? row.original.city ?? '—'),
        h('span', { class: 'text-xs text-(--ui-text-muted)', dir: 'ltr' }, row.original.phone),
      ]),
  },
  {
    accessorKey: 'status',
    header: t('businessRequests.columns.status'),
    cell: ({ row }) =>
      h(
        UBadge,
        { color: STATUS_COLORS[row.original.status] ?? 'neutral', variant: 'subtle', size: 'sm' },
        () => t(`businessRequests.status.${row.original.status}`)
      ),
  },
])

onMounted(loadRequests)
</script>

<template>
  <UDashboardPanel :ui="{ body: 'flex flex-col flex-1 overflow-hidden p-0 gap-0' }">
    <template #header>
      <UDashboardNavbar :title="t('businessRequests.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge color="neutral" variant="subtle">
            {{ t('businessRequests.totalBadge', { total }) }}
          </UBadge>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('businessRequests.refresh')"
            :loading="isLoading"
            @click="loadRequests"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <TableSkeleton v-if="isLoading && !requests.length" :tabs="3" :filters="1" :columns="5" />
      <template v-else>
        <div class="shrink-0 border-b border-default">
          <div class="flex gap-1 px-4 pt-4 flex-wrap" role="group">
            <UButton
              v-for="tab in kindTabs"
              :key="tab.value ?? 'all'"
              size="sm"
              :color="kind === tab.value ? 'primary' : 'neutral'"
              :variant="kind === tab.value ? 'solid' : 'ghost'"
              :aria-pressed="kind === tab.value"
              @click="kind = tab.value"
            >
              {{ tab.label }}
            </UButton>
          </div>
          <div class="flex gap-3 px-4 py-3">
            <USelect
              v-model="status"
              :items="statusOptions"
              :aria-label="t('businessRequests.columns.status')"
              class="w-44"
            />
          </div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto p-4">
          <UEmpty
            v-if="!requests.length"
            icon="i-lucide-store"
            :title="t('businessRequests.empty')"
          />
          <UTable v-else :data="requests" :columns="columns" :loading="isLoading" class="w-full" />
        </div>

        <div v-if="totalPages > 1" class="shrink-0 flex justify-center p-4 border-t border-default">
          <UPagination
            v-model:page="page"
            :total="total"
            :items-per-page="BUSINESS_REQUESTS_PAGE_SIZE"
          />
        </div>
      </template>
    </template>
  </UDashboardPanel>

  <BusinessRequestSlideover
    v-model:open="isSlideoverOpen"
    :request="selectedRequest"
    :is-saving="isSaving"
    @save="handleSave"
  />
</template>

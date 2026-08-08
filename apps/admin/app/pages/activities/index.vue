<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { Activity, Category, Place } from '~/types'
import ActivitiesSlideover from '~/components/activities/ActivitiesSlideover.vue'
import { syncUrlPage } from '~/composables/useUrlPage'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')

const { tc } = useI18nContent()
const { t } = useI18n()
const overlay = useOverlay()
const router = useRouter()

const {
  activities,
  total,
  loading,
  filters,
  fetch: fetchActivities,
  remove,
  removeMany,
} = useActivities()

syncUrlPage(toRef(filters, 'page'))

// Datos para los filtros — en paralelo entre sí y con el fetch inicial de
// actividades (antes eran 3 awaits secuenciales, cada uno un round-trip completo)
const [{ data: categories }, { data: places }] = await Promise.all([
  useFetch<Category[]>('/api/categories'),
  useFetch<Place[]>('/api/places'),
  fetchActivities(),
])

const categoryOptions = computed(() => [
  { label: t('activities.filters.allCategories'), value: 'all' },
  ...(categories.value ?? []).map((c) => ({ label: tc(c.name_i18n ?? {}), value: c.id })),
])

const placeOptions = computed(() => [
  { label: t('activities.filters.allPlaces'), value: 'all' },
  ...(places.value ?? []).map((p) => ({
    label: p.city?.name ? `${tc(p.name_i18n ?? {})} — ${p.city.name}` : tc(p.name_i18n ?? {}),
    value: p.id,
  })),
])

// Selectores con 'all' → undefined
const categoryFilter = ref('all')
const placeFilter = ref('all')

watch(categoryFilter, (val) => {
  filters.category_id = val === 'all' ? undefined : val
})
watch(placeFilter, (val) => {
  filters.place_id = val === 'all' ? undefined : val
})

// Selección de filas
const rowSelection = ref<Record<string, boolean>>({})

const selectedRows = computed(() => {
  return activities.value.filter((_, index) => rowSelection.value[index])
})

// Slideover
const openCreate = async () => {
  const slideover = overlay.create(ActivitiesSlideover, {
    props: { place: null },
  })
  await slideover.open()
  fetchActivities()
}

const openEdit = async (activity: Activity) => {
  const slideover = overlay.create(ActivitiesSlideover, {
    props: { activity },
  })
  await slideover.open()
  fetchActivities()
}

// Delete
const deleteLoading = ref(false)

const handleDelete = async (ids: string[]) => {
  deleteLoading.value = true
  try {
    if (ids.length === 1) {
      await remove(ids[0])
    } else {
      await removeMany(ids)
    }
    rowSelection.value = {}
  } finally {
    deleteLoading.value = false
  }
}

// Status helpers
const statusColor = {
  approved: 'success',
  pending: 'warning',
  rejected: 'error',
} as const

const statusLabel = computed(() => ({
  approved: t('activities.status.approved'),
  pending: t('activities.status.pending'),
  rejected: t('activities.status.rejected'),
}))

// Row dropdown items
function getRowItems(row: Row<Activity>) {
  return [
    {
      label: t('activities.actions.edit'),
      icon: 'i-lucide-pencil',
      onSelect: () => openEdit(row.original),
    },
    {
      label: t('activities.actions.viewPlace'),
      icon: 'i-lucide-map-pin',
      onSelect: () => router.push(`/places/${row.original.place_id}`),
    },
    { type: 'separator' as const },
    {
      label: t('activities.actions.delete'),
      icon: 'i-lucide-trash',
      color: 'error' as const,
      onSelect: () => handleDelete([row.original.id]),
    },
  ]
}

// Columnas
const columns = computed<TableColumn<Activity>[]>(() => [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        ariaLabel: t('activities.table.selectAll'),
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        ariaLabel: t('activities.table.selectRow'),
      }),
  },
  {
    accessorKey: 'title_i18n',
    header: t('activities.table.title'),
    cell: ({ row }) => tc(row.original.title_i18n ?? {}),
  },
  {
    accessorKey: 'place',
    header: t('activities.table.place'),
    cell: ({ row }) => {
      const place = row.original.place
      if (!place) return '—'
      return h('div', undefined, [
        h('p', { class: 'font-medium text-highlighted' }, tc(place.name_i18n ?? {})),
        h('p', { class: 'text-xs text-muted' }, place.city?.name ?? ''),
      ])
    },
  },
  {
    accessorKey: 'category',
    header: t('activities.table.category'),
    cell: ({ row }) => (row.original.category ? tc(row.original.category.name_i18n ?? {}) : '—'),
  },
  {
    accessorKey: 'price',
    header: t('activities.table.price'),
    cell: ({ row }) =>
      row.original.is_free
        ? h(UBadge, { variant: 'subtle', color: 'success' }, () => t('activities.free'))
        : `₪${row.original.price ?? 0}`,
  },
  {
    accessorKey: 'status',
    header: t('activities.table.status'),
    cell: ({ row }) =>
      h(
        UBadge,
        { variant: 'subtle', color: statusColor[row.original.status] },
        () => statusLabel.value[row.original.status]
      ),
  },
  {
    id: 'actions',
    cell: ({ row }) =>
      h(
        'div',
        { class: 'text-right' },
        h(
          UDropdownMenu,
          {
            content: { align: 'end' },
            items: getRowItems(row),
          },
          () =>
            h(UButton, {
              icon: 'i-lucide-ellipsis-vertical',
              color: 'neutral',
              variant: 'ghost',
              class: 'ml-auto',
            })
        )
      ),
  },
])

// Total de páginas
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / filters.pageSize)))

// Texto de selección en el pie de la tabla
const selectionText = computed(() =>
  t('activities.pagination.selected', {
    selected: selectedRows.value.length,
    total: total.value,
  })
)
</script>

<template>
  <UDashboardPanel id="activities" :ui="{ body: 'flex flex-col flex-1 overflow-hidden p-0 gap-0' }">
    <template #header>
      <UDashboardNavbar :title="t('activities.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" @click="openCreate">
            {{ t('activities.newButton') }}
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Zona fija: search + filtros, nunca scrollea -->
      <div
        class="shrink-0 flex flex-wrap items-center justify-between gap-1.5 p-4 border-b border-default"
      >
        <UInput
          v-model="filters.q"
          icon="i-lucide-search"
          :placeholder="t('activities.searchPlaceholder')"
          class="max-w-sm"
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <!-- Acciones bulk -->
          <ActivitiesDeleteModal
            v-if="selectedRows.length"
            :count="selectedRows.length"
            :loading="deleteLoading"
            @confirm="handleDelete(selectedRows.map((r) => r.id))"
          >
            <UButton
              :label="t('activities.deleteButton')"
              color="error"
              variant="subtle"
              icon="i-lucide-trash"
            >
              <template #trailing>
                <UKbd>{{ selectedRows.length }}</UKbd>
              </template>
            </UButton>
          </ActivitiesDeleteModal>

          <UButton
            v-if="selectedRows.length === 1"
            :label="t('activities.editButton')"
            color="neutral"
            variant="subtle"
            icon="i-lucide-pencil"
            @click="openEdit(selectedRows[0])"
          />

          <!-- Filtros -->
          <USelect
            v-model="filters.status"
            :items="[
              { label: t('activities.filters.allStatuses'), value: 'all' },
              { label: t('activities.status.approved'), value: 'approved' },
              { label: t('activities.status.pending'), value: 'pending' },
              { label: t('activities.status.rejected'), value: 'rejected' },
            ]"
            class="min-w-36"
          />

          <USelect
            v-model="categoryFilter"
            :items="categoryOptions"
            :placeholder="t('activities.filters.categoryPlaceholder')"
            class="min-w-36"
          />

          <USelect
            v-model="placeFilter"
            :items="placeOptions"
            :placeholder="t('activities.filters.placePlaceholder')"
            searchable
            class="min-w-44"
          />
        </div>
      </div>

      <!-- Zona scrolleable: solo la tabla -->
      <div class="flex-1 min-h-0 overflow-y-auto p-4">
        <UTable
          v-model:row-selection="rowSelection"
          :data="activities"
          :columns="columns"
          :loading="loading"
          :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
            tbody:
              '[&>tr]:last:[&>td]:border-b-0 [&>tr]:hover:bg-elevated/50 [&>tr]:cursor-pointer [&>tr]:transition-colors',
            th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
            td: 'border-b border-default',
            separator: 'h-0',
          }"
          @click="
            (e: MouseEvent) => {
              const target = e.target as HTMLElement
              if (target.closest('[data-radix-popper-content-wrapper]')) return
              if (target.closest('button')) return
              if (target.closest('input[type=checkbox]')) return
              if (target.closest('label')) return

              const tr = target.closest('tbody tr')
              if (!tr) return

              const tbody = tr.closest('tbody')
              if (!tbody) return
              const rows = Array.from(tbody.querySelectorAll('tr'))
              const index = rows.indexOf(tr as HTMLTableRowElement)
              const activity = activities[index]
              if (activity) openEdit(activity)
            }
          "
        />
      </div>

      <!-- Zona fija: paginación, siempre visible abajo -->
      <div class="shrink-0 flex items-center justify-between gap-3 p-4 border-t border-default">
        <div class="text-sm text-muted">
          {{ selectionText }}
        </div>

        <UPagination
          v-if="pageCount > 1"
          :default-page="filters.page"
          :items-per-page="filters.pageSize"
          :total="total"
          @update:page="(p: number) => (filters.page = p)"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

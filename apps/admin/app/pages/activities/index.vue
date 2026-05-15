<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { Activity, Category, Place } from '~/types'
import ActivitiesSlideover from '~/components/activities/ActivitiesSlideover.vue'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')

const { tc } = useI18nContent()
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

// Datos para los filtros
const { data: categories } = await useFetch<Category[]>('/api/categories')
const { data: places } = await useFetch<Place[]>('/api/places')

const categoryOptions = computed(() => [
  { label: 'Todas', value: 'all' },
  ...(categories.value ?? []).map((c) => ({ label: tc(c.name_i18n ?? {}), value: c.id })),
])

const placeOptions = computed(() => [
  { label: 'Todos', value: 'all' },
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

const statusLabel = {
  approved: 'Aprobada',
  pending: 'Pendiente',
  rejected: 'Rechazada',
}

// Row dropdown items
function getRowItems(row: Row<Activity>) {
  return [
    {
      label: 'Editar',
      icon: 'i-lucide-pencil',
      onSelect: () => openEdit(row.original),
    },
    {
      label: 'Ver lugar',
      icon: 'i-lucide-map-pin',
      onSelect: () => router.push(`/places/${row.original.place_id}`),
    },
    { type: 'separator' as const },
    {
      label: 'Eliminar',
      icon: 'i-lucide-trash',
      color: 'error' as const,
      onSelect: () => handleDelete([row.original.id]),
    },
  ]
}

// Columnas
const columns: TableColumn<Activity>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        ariaLabel: 'Seleccionar todas',
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        ariaLabel: 'Seleccionar fila',
      }),
  },
  {
    accessorKey: 'title_i18n',
    header: 'Título',
    cell: ({ row }) => tc(row.original.title_i18n ?? {}),
  },
  {
    accessorKey: 'place',
    header: 'Lugar',
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
    header: 'Categoría',
    cell: ({ row }) => (row.original.category ? tc(row.original.category.name_i18n ?? {}) : '—'),
  },
  {
    accessorKey: 'price',
    header: 'Precio',
    cell: ({ row }) =>
      row.original.is_free
        ? h(UBadge, { variant: 'subtle', color: 'success' }, () => 'Gratis')
        : `₪${row.original.price ?? 0}`,
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) =>
      h(
        UBadge,
        { variant: 'subtle', color: statusColor[row.original.status] },
        () => statusLabel[row.original.status]
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
]

// Total de páginas
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / filters.pageSize)))

// Fetch inicial
await fetchActivities()
</script>

<template>
  <UDashboardPanel id="activities">
    <template #header>
      <UDashboardNavbar title="Actividades">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" @click="openCreate"> Nueva actividad </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Toolbar: search + filtros -->
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="filters.q"
          icon="i-lucide-search"
          placeholder="Buscar actividades..."
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
            <UButton label="Eliminar" color="error" variant="subtle" icon="i-lucide-trash">
              <template #trailing>
                <UKbd>{{ selectedRows.length }}</UKbd>
              </template>
            </UButton>
          </ActivitiesDeleteModal>

          <UButton
            v-if="selectedRows.length === 1"
            label="Editar"
            color="neutral"
            variant="subtle"
            icon="i-lucide-pencil"
            @click="openEdit(selectedRows[0])"
          />

          <!-- Filtros -->
          <USelect
            v-model="filters.status"
            :items="[
              { label: 'Todos los estados', value: 'all' },
              { label: 'Aprobada', value: 'approved' },
              { label: 'Pendiente', value: 'pending' },
              { label: 'Rechazada', value: 'rejected' },
            ]"
            class="min-w-36"
          />

          <USelect
            v-model="categoryFilter"
            :items="categoryOptions"
            placeholder="Categoría"
            class="min-w-36"
          />

          <USelect
            v-model="placeFilter"
            :items="placeOptions"
            placeholder="Lugar"
            searchable
            class="min-w-44"
          />
        </div>
      </div>

      <!-- Tabla -->
      <UTable
        v-model:row-selection="rowSelection"
        class="shrink-0 mt-4"
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

      <!-- Paginación -->
      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          {{ selectedRows.length }} de {{ total }} actividad{{
            total !== 1 ? 'es' : ''
          }}
          seleccionada{{ selectedRows.length !== 1 ? 's' : '' }}.
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

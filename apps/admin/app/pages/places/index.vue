<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Place } from '~/types'
import PlacesSlideover from '~/components/places/PlacesSlideover.vue'
import { syncUrlPage, syncUrlParam } from '~/composables/useUrlPage'
import { useFacets } from '~/composables/useFacets'
import { usePlacesStale } from '~/composables/useCatalogStale'

// Nombre explícito para que el matching de <keep-alive> (definePageMeta de
// abajo) no dependa del nombre inferido del archivo, que podría colisionar
// con otro index.vue de otra carpeta.
defineOptions({ name: 'PlacesIndexPage' })
definePageMeta({ keepalive: true })

interface PlaceFacetRow {
  status: string
  city: string | null
}

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')

const { tc } = useI18nContent()
const { t } = useI18n()
const overlay = useOverlay()
const router = useRouter()

const { places, total, loading, filters, fetch: loadPlaces, remove, removeMany } = usePlaces()

syncUrlPage(toRef(filters, 'page'))
syncUrlParam(toRef(filters, 'city') as unknown as Ref<string>, 'city')
syncUrlParam(toRef(filters, 'status') as unknown as Ref<string>, 'status')

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / filters.pageSize)))

// Se carga en onMounted, junto con el resto de la carga inicial — no
// bloquea la navegación (ver el onMounted al final del script).
const cities = ref<{ id: number; name: string }[]>([])

// Conteos por faceta — cuántos lugares quedarían con cada opción, manteniendo
// el resto de filtros fijos (mismo patrón que Sugerencias/apps/web).
const facets = useFacets<PlaceFacetRow>('/api/places/facets', {
  city: toRef(filters, 'city') as unknown as Ref<string>,
  status: toRef(filters, 'status') as unknown as Ref<string>,
})

const withCount = (label: string, count: number) => `${label} (${count})`

const cityOptions = computed(() => [
  { label: withCount(t('places.filters.allCities'), facets.countFor('city', 'all')), value: 'all' },
  ...(cities.value ?? []).map((c) => ({
    label: withCount(c.name, facets.countFor('city', c.name)),
    value: c.name,
    disabled: facets.isDisabled('city', c.name),
  })),
])
const statusOptions = computed(() => [
  {
    label: withCount(t('places.filters.allStatus'), facets.countFor('status', 'all')),
    value: 'all',
  },
  {
    label: withCount(t('places.status.active'), facets.countFor('status', 'active')),
    value: 'active',
    disabled: facets.isDisabled('status', 'active'),
  },
  {
    label: withCount(t('places.status.inactive'), facets.countFor('status', 'inactive')),
    value: 'inactive',
    disabled: facets.isDisabled('status', 'inactive'),
  },
])

const openCreate = async () => {
  const slideover = overlay.create(PlacesSlideover, {
    props: { place: null, cities: cities.value },
  })
  await slideover.open()
  await Promise.all([loadPlaces(), facets.load()])
}

const openEdit = async (place: Place) => {
  const slideover = overlay.create(PlacesSlideover, {
    props: { place, cities: cities.value },
  })
  await slideover.open()
  await Promise.all([loadPlaces(), facets.load()])
}

const deletePlace = async (id: string) => {
  try {
    await remove(id)
    await facets.load()
  } catch {
    // ya se mostró el toast de error dentro del composable
  }
}

// Selección de filas — mismo patrón que activities/index.vue
const rowSelection = ref<Record<string, boolean>>({})

const selectedRows = computed(() => places.value.filter((_, index) => rowSelection.value[index]))

const deleteLoading = ref(false)

const handleDelete = async (ids: string[]) => {
  deleteLoading.value = true
  try {
    if (ids.length === 1) {
      await deletePlace(ids[0])
    } else {
      await removeMany(ids)
      await facets.load()
    }
    rowSelection.value = {}
  } finally {
    deleteLoading.value = false
  }
}

const statusColor = {
  active: 'success',
  inactive: 'neutral',
} as const

const statusLabel = computed(() => ({
  active: t('places.status.active'),
  inactive: t('places.status.inactive'),
}))

const columns = computed<TableColumn<Place>[]>(() => [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        ariaLabel: t('places.table.selectAll'),
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        ariaLabel: t('places.table.selectRow'),
      }),
  },
  {
    accessorKey: 'name_i18n',
    header: t('places.table.name'),
    cell: ({ row }) =>
      h('span', { 'data-place-id': row.original.id }, tc(row.original.name_i18n ?? {})),
  },
  {
    accessorKey: 'city',
    header: t('places.table.city'),
    cell: ({ row }) => row.original.city?.name ?? '—',
  },
  {
    accessorKey: 'activities',
    header: t('places.table.activities'),
    cell: ({ row }) => {
      const count = row.original.activities?.[0]?.count ?? 0
      return h(UBadge, { variant: 'subtle', color: 'primary' }, () => count)
    },
  },
  {
    accessorKey: 'status',
    header: t('places.table.status'),
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
            items: [
              {
                label: t('places.actions.edit'),
                icon: 'i-lucide-pencil',
                onSelect: () => openEdit(row.original),
              },
              { type: 'separator' },
              {
                label: t('places.actions.delete'),
                icon: 'i-lucide-trash',
                color: 'error',
                onSelect: () => deletePlace(row.original.id),
              },
            ],
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

// Carga inicial no bloqueante — ver el comentario equivalente en
// suggestions.vue para por qué es seguro paralelizar esto client-side.
onMounted(async () => {
  await Promise.all([
    loadPlaces(),
    facets.load(),
    $fetch<{ id: number; name: string }[]>('/api/cities').then((r) => {
      cities.value = r
    }),
  ])
})

// Con keepalive esta página no se vuelve a montar al navegar de vuelta —
// sólo se reactiva. Places no cambia sola: se refresca acá sólo si aprobar/
// fusionar una sugerencia (en otra página) la marcó como "sucia" (ver
// useCatalogStale.ts) — evita pegarle a la base en cada visita sin motivo.
const placesStale = usePlacesStale()
onActivated(() => {
  if (!placesStale.value) return
  placesStale.value = false
  Promise.all([loadPlaces(), facets.load()])
})
</script>

<template>
  <UDashboardPanel id="places" :ui="{ body: 'flex flex-col flex-1 overflow-hidden p-0 gap-0' }">
    <template #header>
      <UDashboardNavbar :title="t('places.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" @click="openCreate"> {{ t('places.newButton') }} </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <TableSkeleton v-if="loading && !places.length" :filters="2" :columns="4" />

      <template v-else>
        <!-- Zona fija: búsqueda + filtros -->
        <div
          class="shrink-0 flex flex-wrap items-center justify-between gap-1.5 p-4 border-b border-default"
        >
          <UInput
            v-model="filters.q"
            icon="i-lucide-search"
            :placeholder="t('places.searchPlaceholder')"
            class="max-w-sm"
          />

          <div class="flex flex-wrap items-center gap-1.5">
            <!-- Acciones bulk -->
            <PlacesDeleteModal
              v-if="selectedRows.length"
              :count="selectedRows.length"
              :loading="deleteLoading"
              @confirm="handleDelete(selectedRows.map((r) => r.id))"
            >
              <UButton
                :label="t('places.deleteButton')"
                color="error"
                variant="subtle"
                icon="i-lucide-trash"
              >
                <template #trailing>
                  <UKbd>{{ selectedRows.length }}</UKbd>
                </template>
              </UButton>
            </PlacesDeleteModal>

            <UButton
              v-if="selectedRows.length === 1"
              :label="t('places.editButton')"
              color="neutral"
              variant="subtle"
              icon="i-lucide-pencil"
              @click="openEdit(selectedRows[0])"
            />

            <USelect v-model="filters.city" :items="cityOptions" class="min-w-44" />
            <USelect v-model="filters.status" :items="statusOptions" class="min-w-36" />
          </div>
        </div>

        <!-- Zona scrolleable: solo la tabla -->
        <div class="flex-1 min-h-0 overflow-y-auto p-4">
          <UTable
            v-model:row-selection="rowSelection"
            :data="places"
            :columns="columns"
            :loading="loading"
            :ui="{
              base: 'table-fixed border-separate border-spacing-0',
              thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
              tbody:
                '[&>tr]:last:[&>td]:border-b-0 [&>tr]:hover:bg-elevated/50 [&>tr]:cursor-pointer [&>tr]:transition-colors',
              th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
              td: 'border-b border-default',
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
                const idEl = tr.querySelector('[data-place-id]')
                const placeId = idEl?.getAttribute('data-place-id')
                if (placeId) router.push(`/places/${placeId}`)
              }
            "
          />
        </div>

        <!-- Zona fija: paginación, siempre visible abajo -->
        <div class="shrink-0 flex items-center justify-between gap-3 p-4 border-t border-default">
          <div class="text-sm text-muted">
            {{ t('places.pagination.selected', { selected: selectedRows.length, total }) }}
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
    </template>
  </UDashboardPanel>
</template>

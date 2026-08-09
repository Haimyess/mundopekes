<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Place } from '~/types'
import PlacesSlideover from '~/components/places/PlacesSlideover.vue'
import { syncUrlPage } from '~/composables/useUrlPage'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const { tc } = useI18nContent()
const { t } = useI18n()
const overlay = useOverlay()
const router = useRouter()

const { places, total, loading, filters, fetch: loadPlaces, remove } = usePlaces()

syncUrlPage(toRef(filters, 'page'))

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / filters.pageSize)))

const { data: cities } = await useFetch<{ name: string }[]>('/api/cities')
const cityOptions = computed(() => [
  { label: t('places.filters.allCities'), value: 'all' },
  ...(cities.value ?? []).map((c) => ({ label: c.name, value: c.name })),
])

const openCreate = async () => {
  const slideover = overlay.create(PlacesSlideover, {
    props: { place: null },
  })
  await slideover.open()
  loadPlaces()
}

const openEdit = async (place: Place) => {
  const slideover = overlay.create(PlacesSlideover, {
    props: { place },
  })
  await slideover.open()
  loadPlaces()
}

const deletePlace = async (id: string) => {
  try {
    await remove(id)
  } catch {
    // ya se mostró el toast de error dentro del composable
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

await loadPlaces()
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
          <USelect v-model="filters.city" :items="cityOptions" class="min-w-44" />
          <USelect
            v-model="filters.status"
            :items="[
              { label: t('places.filters.allStatus'), value: 'all' },
              { label: t('places.status.active'), value: 'active' },
              { label: t('places.status.inactive'), value: 'inactive' },
            ]"
            class="min-w-36"
          />
        </div>
      </div>

      <!-- Zona scrolleable: solo la tabla -->
      <div class="flex-1 min-h-0 overflow-y-auto p-4">
        <UTable
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
      <div v-if="pageCount > 1" class="shrink-0 flex justify-end p-4 border-t border-default">
        <UPagination
          :default-page="filters.page"
          :items-per-page="filters.pageSize"
          :total="total"
          @update:page="(p: number) => (filters.page = p)"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

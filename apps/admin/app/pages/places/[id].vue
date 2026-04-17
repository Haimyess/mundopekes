<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Place, Activity } from '~/types'
import PlacesSlideover from '~/components/places/PlacesSlideover.vue'
import ActivitiesSlideover from '~/components/activities/ActivitiesSlideover.vue'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const route = useRoute()
const overlay = useOverlay()

const id = route.params.id as string

const { data: place, refresh: refreshPlace } = await useFetch<Place>(`/api/places/${id}`)

const {
  activities,
  loading: activitiesLoading,
  fetch: fetchActivities,
  remove: removeActivity,
} = useActivities({ placeId: id })

const openEditPlace = async () => {
  const slideover = overlay.create(PlacesSlideover, {
    props: { place: place.value },
  })
  await slideover.open()
  refreshPlace()
}

const openCreateActivity = async () => {
  const slideover = overlay.create(ActivitiesSlideover, {
    props: { placeId: id },
  })
  await slideover.open()
  fetchActivities()
}

const openEditActivity = async (activity: Activity) => {
  const slideover = overlay.create(ActivitiesSlideover, {
    props: { activity, placeId: id },
  })
  await slideover.open()
  fetchActivities()
}

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

const columns: TableColumn<Activity>[] = [
  {
    accessorKey: 'title',
    header: 'Título',
  },
  {
    accessorKey: 'category',
    header: 'Categoría',
    cell: ({ row }) => row.original.category?.name ?? '—',
  },
  {
    accessorKey: 'price',
    header: 'Precio',
    cell: ({ row }) =>
      row.original.is_free
        ? h(UBadge, { variant: 'subtle', color: 'success' }, () => 'Gratis')
        : `₪${row.original.price}`,
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
            items: [
              {
                label: 'Editar',
                icon: 'i-lucide-pencil',
                onSelect: () => openEditActivity(row.original),
              },
              { type: 'separator' as const },
              {
                label: 'Eliminar',
                icon: 'i-lucide-trash',
                color: 'error' as const,
                onSelect: () => removeActivity(row.original.id),
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
]

// Fetch inicial de actividades (sin paginación, usa el composable con placeId fijo)
await fetchActivities()
</script>

<template>
  <UDashboardPanel :id="`place-${id}`">
    <template #header>
      <UDashboardNavbar :title="place?.name ?? '...'">
        <template #leading>
          <UDashboardSidebarCollapse />
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/places"
          />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-pencil"
            color="neutral"
            variant="outline"
            @click="openEditPlace"
          >
            Editar lugar
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Info del lugar -->
      <div class="mb-8 p-4 rounded-lg border border-default bg-elevated/30">
        <div class="flex flex-wrap gap-3 mb-2">
          <UBadge v-if="place?.city" variant="subtle" color="neutral">
            {{ place.city.name }}
          </UBadge>
          <UBadge v-if="place?.lat && place?.lng" variant="subtle" color="neutral">
            {{ place.lat }}, {{ place.lng }}
          </UBadge>
        </div>
        <p v-if="place?.description" class="text-muted text-sm">
          {{ place.description }}
        </p>
        <p v-else class="text-muted text-sm italic">Sin descripción</p>
      </div>

      <!-- Actividades -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-semibold text-base">
          Actividades
          <UBadge variant="subtle" color="neutral" class="ml-2">
            {{ activities.length }}
          </UBadge>
        </h2>
        <UButton icon="i-lucide-plus" size="sm" @click="openCreateActivity">
          Nueva actividad
        </UButton>
      </div>

      <UTable
        :data="activities"
        :columns="columns"
        :loading="activitiesLoading"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
        }"
      />
    </template>
  </UDashboardPanel>
</template>
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Place, Activity } from '~/types'
import PlacesSlideover from '~/components/places/PlacesSlideover.vue'
import ActivitiesSlideover from '~/components/activities/ActivitiesSlideover.vue'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const { tc } = useI18nContent()
const route = useRoute()
const overlay = useOverlay()

const id = route.params.id as string

const {
  data: place,
  refresh: refreshPlace,
  error: placeError,
} = await useFetch<Place>(`/api/places/${id}`)

const placeMeta = computed(() => {
  const m =
    (place.value?.metadata as {
      phone?: string | null
      website?: string | null
      opening_hours_text?: string[] | null
      photos?: string[] | null
    } | null) ?? {}
  return m
})

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
    props: { placeId: id, place: place.value },
  })
  await slideover.open()
  fetchActivities()
}

const openEditActivity = async (activity: Activity) => {
  const slideover = overlay.create(ActivitiesSlideover, {
    props: { activity, placeId: id, place: place.value },
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
    accessorKey: 'title_i18n',
    header: 'Título',
    cell: ({ row }) => tc(row.original.title_i18n ?? {}),
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
      <UDashboardNavbar :title="place ? tc(place.name_i18n ?? {}) : '...'">
        <template #leading>
          <UDashboardSidebarCollapse />
          <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" to="/places" />
        </template>
        <template #right>
          <UButton icon="i-lucide-pencil" color="neutral" variant="outline" @click="openEditPlace">
            Editar lugar
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Error state -->
      <div
        v-if="placeError"
        class="flex flex-col items-center justify-center gap-3 py-16 text-center"
      >
        <UIcon name="i-lucide-map-pin-off" class="size-10 text-muted" />
        <p class="font-medium text-highlighted">No se pudo cargar el lugar</p>
        <p class="text-sm text-muted">{{ placeError.message }}</p>
        <UButton variant="outline" color="neutral" icon="i-lucide-refresh-cw" @click="refreshPlace">
          Reintentar
        </UButton>
      </div>

      <!-- Contenido del lugar (oculto si hay error) -->
      <template v-else>
        <!-- Info del lugar -->
        <div class="mb-8 p-4 rounded-lg border border-default bg-elevated/30 flex flex-col gap-3">
          <!-- City + coords -->
          <div class="flex flex-wrap gap-3">
            <UBadge v-if="place?.city" variant="subtle" color="neutral">
              {{ place.city.name }}
            </UBadge>
            <UBadge v-if="place?.lat && place?.lng" variant="subtle" color="neutral">
              {{ place.lat }}, {{ place.lng }}
            </UBadge>
          </div>

          <!-- Description -->
          <p
            v-if="place?.description_i18n && Object.keys(place.description_i18n).length"
            class="text-muted text-sm"
          >
            {{ tc(place.description_i18n) }}
          </p>
          <p v-else class="text-muted text-sm italic">Sin descripción</p>

          <!-- Phone + Website -->
          <div v-if="placeMeta.phone || placeMeta.website" class="flex flex-wrap gap-4">
            <a
              v-if="placeMeta.phone"
              :href="`tel:${placeMeta.phone}`"
              class="flex items-center gap-1.5 text-sm text-primary-500 hover:underline"
            >
              <UIcon name="i-lucide-phone" class="size-4 shrink-0" />
              {{ placeMeta.phone }}
            </a>
            <a
              v-if="placeMeta.website"
              :href="placeMeta.website"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1.5 text-sm text-primary-500 hover:underline min-w-0"
            >
              <UIcon name="i-lucide-globe" class="size-4 shrink-0" />
              <span class="truncate">{{ placeMeta.website }}</span>
            </a>
          </div>

          <!-- Opening hours -->
          <div v-if="placeMeta.opening_hours_text?.length">
            <p class="text-xs font-medium text-muted uppercase tracking-wide mb-1">Horarios</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
              <p
                v-for="(line, i) in placeMeta.opening_hours_text"
                :key="i"
                class="text-xs text-muted"
              >
                {{ line }}
              </p>
            </div>
          </div>

          <!-- Images -->
          <div v-if="place?.images?.length" class="flex flex-wrap gap-2">
            <img
              v-for="url in place.images"
              :key="url"
              :src="url"
              alt=""
              class="size-20 rounded-md object-cover border border-default"
            />
          </div>
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
    </template>
  </UDashboardPanel>
</template>

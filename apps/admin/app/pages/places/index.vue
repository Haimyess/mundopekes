<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Place } from '~/types'
import PlacesSlideover from '~/components/places/PlacesSlideover.vue'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const { tc } = useI18nContent()
const toast = useToast()
const overlay = useOverlay()
const router = useRouter()

const { data, status, refresh } = await useFetch<Place[]>('/api/places', { lazy: true })

const openCreate = async () => {
  const slideover = overlay.create(PlacesSlideover, {
    props: { place: null },
  })
  await slideover.open()
  refresh()
}

const openEdit = async (place: Place) => {
  const slideover = overlay.create(PlacesSlideover, {
    props: { place },
  })
  await slideover.open()
  refresh()
}

const deletePlace = async (id: string) => {
  try {
    await $fetch(`/api/places/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Lugar eliminado', color: 'success' })
    refresh()
  } catch (e) {
    toast.add({
      title: 'Error',
      description: e instanceof Error ? e.message : String(e),
      color: 'error',
    })
  }
}

const search = ref('')

const filtered = computed(() =>
  (data.value ?? []).filter((p) => {
    const name = tc(p.name_i18n ?? {})
    return name.toLowerCase().includes(search.value.toLowerCase())
  })
)

const columns: TableColumn<Place>[] = [
  {
    accessorKey: 'name_i18n',
    header: 'Nombre',
    cell: ({ row }) => tc(row.original.name_i18n ?? {}),
  },
  {
    accessorKey: 'city',
    header: 'Ciudad',
    cell: ({ row }) => row.original.city?.name ?? '—',
  },
  {
    accessorKey: 'activities',
    header: 'Actividades',
    cell: ({ row }) => {
      const count = row.original.activities?.[0]?.count ?? 0
      return h(UBadge, { variant: 'subtle', color: 'primary' }, () => count)
    },
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
                onSelect: () => openEdit(row.original),
              },
              { type: 'separator' },
              {
                label: 'Eliminar',
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
]
</script>

<template>
  <UDashboardPanel id="places">
    <template #header>
      <UDashboardNavbar title="Lugares">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" @click="openCreate"> Nuevo lugar </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Buscar lugares..."
          class="max-w-sm"
        />
      </div>

      <UTable
        :data="filtered"
        :columns="columns"
        :loading="status === 'pending'"
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

            // Si el click viene del dropdown o sus hijos, ignorar
            if (target.closest('[data-radix-popper-content-wrapper]')) return
            if (target.closest('button')) return

            const tr = target.closest('tbody tr')
            if (!tr) return

            // Buscar el id directamente del DOM data attribute
            const tbody = tr.closest('tbody')
            if (!tbody) return
            const rows = Array.from(tbody.querySelectorAll('tr'))
            const index = rows.indexOf(tr as HTMLTableRowElement)
            const place = filtered[index]
            if (place) router.push(`/places/${place.id}`)
          }
        "
      />
    </template>
  </UDashboardPanel>
</template>

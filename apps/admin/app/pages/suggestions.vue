<!-- app/pages/suggestions.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Suggestion } from '~/composables/useSuggestions'
import { syncUrlPage, syncUrlParam } from '~/composables/useUrlPage'
import { useFacets } from '~/composables/useFacets'

interface SuggestionFacetRow {
  status: string
  category_id: string | null
  city: string | null
  is_free: boolean
}

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')

const { t, locale } = useI18n()
const { tc } = useI18nContent()

const {
  suggestions,
  total,
  loading,
  statusFilter,
  categoryFilter,
  cityFilter,
  isFreeFilter,
  page,
  pageSize,
  fetch: loadSuggestions,
} = useSuggestions()

syncUrlPage(page)
syncUrlParam(statusFilter as unknown as Ref<string>, 'status')
syncUrlParam(categoryFilter, 'category')
syncUrlParam(cityFilter, 'city')
syncUrlParam(isFreeFilter as unknown as Ref<string>, 'free')

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

// Opciones de filtro — categorías y ciudades reales, no derivadas de la página actual
// (headers: forward de la cookie de sesión al SSR — ver useFacets.ts)
const ssrCookieHeaders = useRequestHeaders(['cookie'])
const { data: categories } = await useFetch<{ id: string; name_i18n: Record<string, string> }[]>(
  '/api/categories',
  { headers: ssrCookieHeaders }
)
const { data: cities } = await useFetch<string[]>('/api/suggestions/cities', {
  headers: ssrCookieHeaders,
})

// Conteos por faceta — cuántas sugerencias quedarían con cada opción,
// manteniendo el resto de filtros fijos (mismo patrón que apps/web).
const facets = useFacets<SuggestionFacetRow>('/api/suggestions/facets', {
  status: statusFilter as unknown as Ref<string>,
  category_id: categoryFilter,
  city: cityFilter,
  is_free: isFreeFilter as unknown as Ref<string>,
})

const withCount = (label: string, count: number) => `${label} (${count})`

const categoryOptions = computed(() => [
  {
    label: withCount(t('suggestions.filters.allCategories'), facets.countFor('category_id', 'all')),
    value: 'all',
  },
  ...(categories.value ?? []).map((c) => ({
    label: withCount(tc(c.name_i18n ?? {}), facets.countFor('category_id', c.id)),
    value: c.id,
    disabled: facets.isDisabled('category_id', c.id),
  })),
])
const cityOptions = computed(() => [
  {
    label: withCount(t('suggestions.filters.allCities'), facets.countFor('city', 'all')),
    value: 'all',
  },
  ...(cities.value ?? []).map((c) => ({
    label: withCount(c, facets.countFor('city', c)),
    value: c,
    disabled: facets.isDisabled('city', c),
  })),
])
const freeOptions = computed(() => [
  {
    label: withCount(t('suggestions.filters.allPrices'), facets.countFor('is_free', 'all')),
    value: 'all',
  },
  {
    label: withCount(t('suggestions.filters.free'), facets.countFor('is_free', 'true')),
    value: 'true',
    disabled: facets.isDisabled('is_free', 'true'),
  },
  {
    label: withCount(t('suggestions.filters.paid'), facets.countFor('is_free', 'false')),
    value: 'false',
    disabled: facets.isDisabled('is_free', 'false'),
  },
])

const selected = ref<Suggestion | null>(null)
const slideoverOpen = ref(false)

const openSuggestion = (suggestion: Suggestion) => {
  selected.value = suggestion
  slideoverOpen.value = true
}

const onClose = () => {
  slideoverOpen.value = false
  setTimeout(() => {
    selected.value = null
  }, 300)
}

const onAction = async () => {
  await Promise.all([loadSuggestions(), facets.load()])
}

// Tabs de filtro — con conteo por status (facetas, no solo la página actual)
const tabs = computed(() => [
  {
    label: `${t('suggestions.tabs.pending')} (${facets.countFor('status', 'pending')})`,
    value: 'pending',
    icon: 'i-lucide-clock',
  },
  {
    label: `${t('suggestions.tabs.approved')} (${facets.countFor('status', 'approved')})`,
    value: 'approved',
    icon: 'i-lucide-check-circle',
  },
  {
    label: `${t('suggestions.tabs.rejected')} (${facets.countFor('status', 'rejected')})`,
    value: 'rejected',
    icon: 'i-lucide-x-circle',
  },
  {
    label: `${t('suggestions.tabs.all')} (${facets.countFor('status', 'all')})`,
    value: 'all',
    icon: 'i-lucide-list',
  },
])

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(locale.value === 'en' ? 'en-US' : 'es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const statusColor = (status: string) =>
  ({
    pending: 'warning' as const,
    approved: 'success' as const,
    rejected: 'error' as const,
  })[status] ?? 'neutral'

const statusLabel = (status: string) =>
  ({
    pending: t('suggestions.status.pending'),
    approved: t('suggestions.status.approved'),
    rejected: t('suggestions.status.rejected'),
  })[status] ?? status

const isFromAgent = (suggestion: Suggestion) =>
  (suggestion.metadata as { source?: string } | null)?.source === 'agent'

const columns = computed<TableColumn<Suggestion>[]>(() => [
  {
    accessorKey: 'name_i18n',
    header: t('suggestions.columns.name'),
    cell: ({ row }) => tc(row.original.name_i18n) || '—',
  },
  {
    accessorKey: 'location',
    header: t('suggestions.columns.city'),
    cell: ({ row }) => row.original.location?.city ?? '—',
  },
  {
    accessorKey: 'type',
    header: t('suggestions.columns.type'),
    cell: ({ row }) => {
      const types = row.original.type ?? []
      return h('div', { class: 'flex gap-1 flex-wrap' }, [
        ...types
          .slice(0, 2)
          .map((t: string) =>
            h(UBadge, { key: t, color: 'neutral', variant: 'subtle', size: 'md' }, () => t)
          ),
        types.length > 2
          ? h('span', { class: 'text-xs text-(--ui-text-muted)' }, `+${types.length - 2}`)
          : null,
      ])
    },
  },
  {
    accessorKey: 'is_free',
    header: t('suggestions.columns.free'),
    cell: ({ row }) =>
      h(UIcon, {
        name: row.original.is_free ? 'i-lucide-check' : 'i-lucide-minus',
        class: row.original.is_free ? 'text-success-500' : 'text-(--ui-text-muted)',
      }),
  },
  {
    id: 'source',
    header: t('suggestions.columns.source'),
    cell: ({ row }) =>
      h(
        UBadge,
        { color: isFromAgent(row.original) ? 'info' : 'neutral', variant: 'subtle', size: 'sm' },
        () =>
          t(isFromAgent(row.original) ? 'suggestions.source.agent' : 'suggestions.source.manual')
      ),
  },
  {
    accessorKey: 'created_at',
    header: t('suggestions.columns.date'),
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-(--ui-text-muted)' }, formatDate(row.original.created_at)),
  },
  {
    accessorKey: 'status',
    header: t('suggestions.columns.status'),
    cell: ({ row }) =>
      h(
        UBadge,
        {
          color: statusColor(row.original.status),
          variant: 'subtle',
          size: 'sm',
        },
        () => statusLabel(row.original.status)
      ),
  },
  {
    id: 'actions',
    cell: ({ row }) =>
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-eye',
        size: 'xs',
        onClick: (e: MouseEvent) => {
          e.stopPropagation()
          openSuggestion(row.original)
        },
      }),
  },
])

// Secuencial, no Promise.all — dos llamadas internas concurrentes a /api/*
// protegidas en el mismo render SSR pueden pisarse (mismo problema ya visto
// en Activities: la primera en ganar la carrera renueva la cookie de sesión,
// la otra usa el token ya consumido y devuelve 401).
await loadSuggestions()
await facets.load()
</script>

<template>
  <UDashboardPanel :ui="{ body: 'flex flex-col flex-1 overflow-hidden p-0 gap-0' }">
    <template #header>
      <UDashboardNavbar :title="t('suggestions.title')">
        <template #right>
          <UBadge color="warning" variant="subtle">
            {{
              statusFilter === 'pending'
                ? total
                : suggestions.filter((s) => s.status === 'pending').length
            }}
            {{ t('suggestions.pendingBadge') }}
          </UBadge>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Zona fija: tabs a la izquierda, filtros a la derecha, nunca scrollea -->
      <div
        class="shrink-0 flex flex-wrap items-center justify-between gap-3 p-4 border-b border-default"
      >
        <div class="flex gap-2 flex-wrap">
          <UButton
            v-for="tab in tabs"
            :key="tab.value"
            :color="statusFilter === tab.value ? 'primary' : 'neutral'"
            :variant="statusFilter === tab.value ? 'solid' : 'outline'"
            :icon="tab.icon"
            size="sm"
            @click="statusFilter = tab.value as any"
          >
            {{ tab.label }}
          </UButton>
        </div>

        <div class="flex gap-2 flex-wrap">
          <USelect v-model="categoryFilter" :items="categoryOptions" class="min-w-44" />
          <USelect v-model="cityFilter" :items="cityOptions" class="min-w-40" />
          <USelect v-model="isFreeFilter" :items="freeOptions" class="min-w-36" />
        </div>
      </div>

      <!-- Zona scrolleable: solo la tabla -->
      <div class="flex-1 min-h-0 overflow-y-auto p-4">
        <UTable
          :data="suggestions"
          :columns="columns"
          :loading="loading"
          class="w-full"
          :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
            tbody:
              '[&>tr]:last:[&>td]:border-b-0 [&>tr]:hover:bg-elevated/50 [&>tr]:cursor-pointer [&>tr]:transition-colors',
            th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
            td: 'border-b border-default',
          }"
        />
      </div>

      <!-- Zona fija: paginación, siempre visible abajo -->
      <div v-if="pageCount > 1" class="shrink-0 flex justify-end p-4 border-t border-default">
        <UPagination
          :default-page="page"
          :items-per-page="pageSize"
          :total="total"
          @update:page="(p: number) => (page = p)"
        />
      </div>
    </template>
  </UDashboardPanel>

  <!-- Slideover detalle -->
  <SuggestionsSlideover
    :open="slideoverOpen"
    :suggestion="selected"
    @approved="onAction"
    @rejected="onAction"
    @close="onClose"
  />
</template>

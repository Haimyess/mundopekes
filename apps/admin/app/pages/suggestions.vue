<!-- app/pages/suggestions.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Suggestion, SuggestionType } from '~/composables/useSuggestions'
import { syncUrlPage, syncUrlParam } from '~/composables/useUrlPage'
import { useFacets } from '~/composables/useFacets'

interface SuggestionFacetRow {
  status: string
  category_id: string | null
  city: string | null
  is_free: boolean
  suggestion_type: string
  flagged_possible_duplicate: boolean
}

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')

const { t, locale } = useI18n()
const { tc } = useI18nContent()
const { locales: contentLocales } = useContentLocales()

// Qué campos de i18n_status importan para el resumen de traducción de una
// sugerencia: las que sólo proponen una actividad para un lugar existente
// tienen name_i18n/description_i18n siempre vacíos por diseño (el contenido
// real vive en el lugar), así que sólo el título de la actividad cuenta.
const translationFieldsFor = (s: Suggestion) =>
  s.suggestion_type === 'experience_for_existing_place'
    ? ['title']
    : ['name', 'description', 'title']

const translationSummary = (s: Suggestion) =>
  summarizeI18nStatus(s.i18n_status, translationFieldsFor(s), contentLocales)

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

// Place/Experience discriminator + duplicate-flag filters — client-side only
// (not part of useSuggestions' own filter state) since they're new and this
// keeps the change scoped to this page.
const suggestionTypeFilter = ref<'all' | SuggestionType>('all')
const duplicateFilter = ref<'all' | 'true'>('all')

syncUrlPage(page)
syncUrlParam(statusFilter as unknown as Ref<string>, 'status')
syncUrlParam(categoryFilter, 'category')
syncUrlParam(cityFilter, 'city')
syncUrlParam(isFreeFilter as unknown as Ref<string>, 'free')
syncUrlParam(suggestionTypeFilter as unknown as Ref<string>, 'type')
syncUrlParam(duplicateFilter as unknown as Ref<string>, 'duplicate')

// Client-side filter on top of the server-paginated list — same pattern as
// `is_free`/`category` would use if this page filtered fully server-side;
// kept local since these two are new and low-cardinality.
const visibleSuggestions = computed(() =>
  suggestions.value.filter((s) => {
    if (suggestionTypeFilter.value !== 'all' && s.suggestion_type !== suggestionTypeFilter.value)
      return false
    if (duplicateFilter.value === 'true' && !s.flagged_possible_duplicate) return false
    return true
  })
)

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

// Opciones de filtro — categorías y ciudades reales, no derivadas de la página
// actual. Se cargan en onMounted (no bloquean la navegación) — ver el
// onMounted al final del script para el resto de la carga inicial.
const categories = ref<{ id: string; name_i18n: Record<string, string> }[]>([])
const cities = ref<string[]>([])

// Conteos por faceta — cuántas sugerencias quedarían con cada opción,
// manteniendo el resto de filtros fijos (mismo patrón que apps/web).
const facets = useFacets<SuggestionFacetRow>('/api/suggestions/facets', {
  status: statusFilter as unknown as Ref<string>,
  category_id: categoryFilter,
  city: cityFilter,
  is_free: isFreeFilter as unknown as Ref<string>,
  suggestion_type: suggestionTypeFilter as unknown as Ref<string>,
  flagged_possible_duplicate: duplicateFilter as unknown as Ref<string>,
})

const withCount = (label: string, count: number) => `${label} (${count})`

const suggestionTypeOptions = computed(() => [
  {
    label: withCount(t('suggestions.filters.allTypes'), facets.countFor('suggestion_type', 'all')),
    value: 'all',
  },
  {
    label: withCount(
      t('suggestions.filters.typeNewPlace'),
      facets.countFor('suggestion_type', 'new_place_with_experience')
    ),
    value: 'new_place_with_experience',
  },
  {
    label: withCount(
      t('suggestions.filters.typeExistingPlace'),
      facets.countFor('suggestion_type', 'experience_for_existing_place')
    ),
    value: 'experience_for_existing_place',
  },
])

const duplicateOptions = computed(() => [
  { label: t('suggestions.filters.allDuplicates'), value: 'all' },
  {
    label: withCount(
      t('suggestions.filters.onlyDuplicates'),
      facets.countFor('flagged_possible_duplicate', 'true')
    ),
    value: 'true',
  },
])

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
    // experience_for_existing_place suggestions store name_i18n: {} on the
    // suggestion itself — the name lives on the joined place instead.
    cell: ({ row }) =>
      tc(row.original.name_i18n) ||
      (row.original.place ? tc(row.original.place.name_i18n) : '') ||
      '—',
  },
  {
    accessorKey: 'location',
    header: t('suggestions.columns.city'),
    cell: ({ row }) => row.original.location?.city ?? row.original.place?.city?.name ?? '—',
  },
  {
    accessorKey: 'category_id',
    header: t('suggestions.columns.category'),
    // Antes mostraba suggestion.type (snapshot de texto libre, congelado al
    // momento del envío — podía quedar desactualizado si la categoría se
    // renombraba). Confirmado 2026-08-28: se reemplaza por category_id (la
    // misma fuente que ahora usa el drawer unificado vía subcategoryOptions),
    // siempre al día.
    cell: ({ row }) => {
      const cat = (categories.value ?? []).find((c) => c.id === row.original.category_id)
      return cat
        ? h(UBadge, { color: 'neutral', variant: 'subtle', size: 'md' }, () => tc(cat.name_i18n))
        : '—'
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
      h('div', { class: 'flex items-center gap-1.5' }, [
        h(
          UBadge,
          {
            color: statusColor(row.original.status),
            variant: 'subtle',
            size: 'sm',
          },
          () => statusLabel(row.original.status)
        ),
        row.original.suggestion_type === 'experience_for_existing_place'
          ? h(UBadge, { color: 'info', variant: 'subtle', size: 'sm' }, () =>
              t('suggestions.filters.typeExistingPlace')
            )
          : null,
        row.original.flagged_possible_duplicate
          ? h(
              UBadge,
              { color: 'warning', variant: 'subtle', size: 'sm', icon: 'i-lucide-alert-triangle' },
              () => t('suggestionsSlideover.possibleDuplicateTitle')
            )
          : null,
      ]),
  },
  {
    id: 'translations',
    header: t('suggestions.columns.translations'),
    cell: ({ row }) => {
      const summary = translationSummary(row.original)
      if (summary.state === 'unknown') {
        return h(
          'span',
          { class: 'text-xs text-(--ui-text-muted)' },
          t('suggestions.translations.unknown')
        )
      }
      if (summary.state === 'complete') {
        return h(
          UBadge,
          { color: 'success', variant: 'subtle', size: 'sm', icon: 'i-lucide-check' },
          () => t('suggestions.translations.complete')
        )
      }
      return h(
        UBadge,
        { color: 'warning', variant: 'subtle', size: 'sm', icon: 'i-lucide-alert-triangle' },
        () =>
          t('suggestions.translations.missing', {
            locales: summary.missingLocales.map((l) => l.toUpperCase()).join(', '),
          })
      )
    },
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

// Carga inicial no bloqueante — la navegación a esta página no espera a
// nada de esto (ver TableSkeleton en el template mientras `loading` es
// true y todavía no hay datos). Antes estas llamadas iban en un await de
// nivel superior del <script setup>, lo que congelaba la navegación del
// router hasta que todas resolvían. Se paralelizan sin riesgo porque ahora
// corren client-side (browser, post-mount), no durante SSR: el problema que
// obligaba a la secuencia (dos requests concurrentes al servidor pisándose
// la rotación del refresh token de Supabase durante el mismo render SSR,
// visto en Activities) no aplica a fetches disparados desde el cliente ya
// montado — pasan por el cliente singleton de Supabase, que serializa sus
// propios refreshes en vez de que cada request compita por separado.
onMounted(async () => {
  await Promise.all([
    loadSuggestions(),
    facets.load(),
    $fetch<{ id: string; name_i18n: Record<string, string> }[]>('/api/categories').then((r) => {
      categories.value = r
    }),
    $fetch<string[]>('/api/suggestions/cities').then((r) => {
      cities.value = r
    }),
  ])
})
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
      <TableSkeleton v-if="loading && !suggestions.length" :tabs="4" :filters="3" :columns="8" />

      <template v-else>
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
            <USelect
              v-model="suggestionTypeFilter"
              :items="suggestionTypeOptions"
              class="min-w-48"
            />
            <USelect v-model="duplicateFilter" :items="duplicateOptions" class="min-w-40" />
          </div>
        </div>

        <!-- Zona scrolleable: solo la tabla -->
        <div class="flex-1 min-h-0 overflow-y-auto p-4">
          <UTable
            :data="visibleSuggestions"
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

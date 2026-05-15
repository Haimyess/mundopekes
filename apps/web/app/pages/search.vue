<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'
import type { Activity, ActivityFilters } from '~/types'

const { t } = useI18n()
const { tc } = useI18nContent()
const route = useRoute()
const router = useRouter()

const store = useActivitiesStore()
const {
  ageOptions,
  cityOptions,
  seasonOptions,
  buildFiltersFromQuery,
  buildQueryFromFilters,
  removeFilterFromQuery,
  countActiveFilters,
  fetchFilteredActivities,
} = useActivityFilters()

const { categoryOptions } = useCategories()

// ── Cargar opciones al montar ─────────────────────────────────────
await store.loadFilterOptions()

// Cargar allActivities al montar para tener conteos desktop disponibles
// (en mobile se cargaba lazy al abrir el drawer, aquí las necesitamos siempre)
onMounted(() => store.loadAllActivities())

// ── Estado principal ──────────────────────────────────────────────
const activities = ref<Activity[]>([])
const loading = ref(false)
const drawerOpen = ref(false)

watch(drawerOpen, async (isOpen) => {
  if (isOpen) await store.loadAllActivities()
})

// ── Source of truth: filtros desde la URL ─────────────────────────
const filtersFromUrl = computed<ActivityFilters>(() => buildFiltersFromQuery(route.query))

const activeFiltersCount = computed(() => countActiveFilters(filtersFromUrl.value))

// ── Estado local desktop ──────────────────────────────────────────
// Estado local — junto a localAge, localCities, etc:
const localCategory = ref<string | undefined>(undefined)
const rawCategoryOpts = ref<{ label: string; value: string; name_i18n: Record<string, string> }[]>(
  []
)
const categoryOpts = computed(() =>
  rawCategoryOpts.value.map((c) => ({ label: tc(c.name_i18n), value: c.value }))
)
const localAge = ref<number | undefined>(undefined)
const localCities = ref<string[]>([])
const localSeason = ref<string | undefined>(undefined)
const localFree = ref(false)
const localStroller = ref(false)
const localWeekends = ref(false)

onMounted(async () => {
  rawCategoryOpts.value = await categoryOptions()
})

// Sincronizar local con URL — resuelve bug de filtros al venir del homepage
watch(
  () => route.query,
  (q) => {
    localAge.value = q.age ? Number(q.age) : undefined
    localCities.value = q.city ? (q.city as string).split(',') : []
    localSeason.value = q.season as string | undefined
    localFree.value = q.free === 'true'
    localStroller.value = q.stroller_friendly === 'true'
    localWeekends.value = q.open_weekends === 'true'
    localCategory.value = q.category as string | undefined
  },
  { immediate: true }
)

// ── Filtros locales como ActivityFilters para los conteos ─────────
// Refleja el estado local actual (sin haber apretado Buscar)
// para que los conteos sean reactivos mientras el usuario selecciona
const localFiltersForCounts = computed<ActivityFilters>(() => {
  const ageOption = ageOptions.value.find((o) => o.value === localAge.value)
  return {
    search: filtersFromUrl.value.search, // preservar search activo de la URL
    age_id: localAge.value,
    age_min: ageOption?.min,
    age_max: ageOption?.max,
    city: localCities.value.length ? localCities.value.join(',') : undefined,
    season: localSeason.value as ActivityFilters['season'],
    is_free: localFree.value || undefined,
    stroller_friendly: localStroller.value || undefined,
    open_weekends: localWeekends.value || undefined,
    category: localCategory.value,
  }
})

// ── Conteos dinámicos desktop — mismo composable que el drawer ────
const {
  countForAge,
  countForCity,
  countForSeason,
  isAgeDisabled,
  isCityDisabled,
  isSeasonDisabled,
  isExtraDisabled,
} = useFilterCounts(
  computed(() => store.allActivities),
  localFiltersForCounts
)

// ── Opciones con conteo inyectado en el label ─────────────────────
// Solo mostramos el conteo si es > 0 para no mostrar "(0)" en opciones disabled
const ageOptionsWithCount = computed(() =>
  ageOptions.value.map((opt) => ({
    ...opt,
    label: countForAge(opt) > 0 ? `${opt.label} (${countForAge(opt)})` : opt.label,
    disabled: isAgeDisabled(opt, localAge.value, opt.value),
  }))
)

const cityOptionsWithCount = computed(() =>
  cityOptions.value.map((opt) => ({
    ...opt,
    label:
      countForCity(opt.value as string) > 0
        ? `${opt.label} (${countForCity(opt.value as string)})`
        : opt.label,
    disabled: isCityDisabled(opt.value as string, localCities.value),
  }))
)

const seasonOptionsWithCount = computed(() =>
  seasonOptions.value.map((opt) => ({
    ...opt,
    label:
      countForSeason(opt.value as string) > 0
        ? `${opt.label} (${countForSeason(opt.value as string)})`
        : opt.label,
    disabled: isSeasonDisabled(opt.value as string, localSeason.value),
  }))
)

// ── Botón limpiar — solo si hay filtros aplicados en la URL ───────
// NO aparece por tener filtros locales pendientes sin aplicar
const showClearBtn = computed(() => activeFiltersCount.value > 0)

// ── Sticky bar ────────────────────────────────────────────────────
const filterBarRef = ref<HTMLElement | null>(null)
const showSticky = ref(false)

useIntersectionObserver(
  filterBarRef,
  (entries) => {
    const entry = entries[0]
    if (entry) showSticky.value = !entry.isIntersecting
  },
  {
    threshold: 0,
    rootMargin: '-64px 0px 0px 0px', // 64px = altura navbar h-16
  }
)

// ── Aplicar filtros desktop → URL ─────────────────────────────────
const applyDesktopFilters = () => {
  const ageOption = ageOptions.value.find((o) => o.value === localAge.value)
  const filters: ActivityFilters = {
    age_id: ageOption?.value,
    age_min: ageOption?.min,
    age_max: ageOption?.max,
    city: localCities.value.length ? localCities.value.join(',') : undefined,
    season: localSeason.value as ActivityFilters['season'],
    is_free: localFree.value || undefined,
    stroller_friendly: localStroller.value || undefined,
    open_weekends: localWeekends.value || undefined,
    category: localCategory.value,
  }
  const query = buildQueryFromFilters(filters, route.query.q as string)
  void router.push({ path: '/search', query })
}

// ── Limpiar ───────────────────────────────────────────────────────
const clearFilters = () => {
  const query = route.query.q ? { q: route.query.q as string } : {}
  void router.push({ path: '/search', query })
}

const clearAll = () => {
  void router.push({ path: '/search', query: {} })
}

// ── Remover chip individual ───────────────────────────────────────
const removeFilter = (key: keyof ActivityFilters, cityValue?: string) => {
  const newQuery = removeFilterFromQuery(route.query, key, cityValue)
  void router.push({ path: '/search', query: newQuery })
}

// ── Drawer mobile ─────────────────────────────────────────────────
const onDrawerApply = (newFilters: ActivityFilters) => {
  const query = buildQueryFromFilters(newFilters, route.query.q as string)
  void router.push({ path: '/search', query })
  drawerOpen.value = false
}

// ── Fetch ─────────────────────────────────────────────────────────
const fetchResults = async () => {
  loading.value = true
  try {
    activities.value = await fetchFilteredActivities(filtersFromUrl.value)
  } finally {
    loading.value = false
  }
}

watch(() => route.query, fetchResults, { immediate: true, deep: true })

// ── SEO ───────────────────────────────────────────────────────────
useSeoMeta({
  title: t('search.page_title'),
  description: t('search.page_description'),
})
</script>

<template>
  <div class="search-page">
    <div class="search-page__container">
      <div class="search-page__header">
        <h1 class="search-page__title">{{ t('search.title') }}</h1>
        <p class="search-page__subtitle">{{ t('search.subtitle') }}</p>
      </div>

      <!-- Barra de filtros — oculta cuando no hay resultados y no carga -->
      <div v-if="loading || activities.length > 0" class="search-page__filter-bar">
        <!-- ── DESKTOP ──────────────────────────────────────────── -->
        <div class="search-page__desktop-filters">
          <UiSelect
            v-model="localCategory"
            :options="categoryOpts"
            :placeholder="t('search.category')"
            :ui="{ content: 'min-w-[12rem]' }"
          />

          <UiSelect
            v-model="localAge"
            :options="ageOptionsWithCount"
            :placeholder="t('search.age')"
            :ui="{ content: 'min-w-[14rem]' }"
          />

          <USelect
            v-model="localCities"
            :items="cityOptionsWithCount"
            :placeholder="t('search.city')"
            multiple
            :ui="{ content: 'min-w-[12rem]' }"
          />

          <UiSelect
            v-model="localSeason"
            :options="seasonOptionsWithCount"
            :placeholder="t('search.season')"
            :ui="{ content: 'min-w-[12rem]' }"
          />

          <UiCheckbox
            v-model="localFree"
            :label="t('search.free')"
            :disabled="isExtraDisabled('is_free', localFree)"
          />

          <UiCheckbox
            v-model="localStroller"
            :label="t('activity.stroller_friendly')"
            :disabled="isExtraDisabled('stroller_friendly', localStroller)"
          />

          <UiCheckbox
            v-model="localWeekends"
            :label="t('activity.open_weekends')"
            :disabled="isExtraDisabled('open_weekends', localWeekends)"
          />

          <div class="search-page__desktop-actions">
            <button v-if="showClearBtn" class="search-page__btn-clear" @click="clearFilters">
              <UIcon name="i-heroicons-x-mark" class="search-page__btn-icon" />
              {{ t('search.clear_filters') }}
            </button>

            <button class="search-page__btn-search" @click="applyDesktopFilters">
              <UIcon name="i-heroicons-magnifying-glass" class="search-page__btn-icon" />
              {{ t('search.search_button') }}
            </button>
          </div>
        </div>

        <!-- DESKTOP chips -->
        <div class="search-page__desktop-chips">
          <SearchActiveFilters
            :filters="filtersFromUrl"
            @remove="removeFilter"
            @clear="clearFilters"
          />
        </div>

        <!-- ── MOBILE ───────────────────────────────────────────── -->
        <div class="search-page__mobile-bar">
          <button class="search-page__filter-btn" @click="drawerOpen = true">
            <UIcon name="i-heroicons-adjustments-horizontal" class="search-page__filter-icon" />
            <span class="search-page__filter-label">{{ t('search.filters') }}</span>
            <span v-if="activeFiltersCount > 0" class="search-page__filter-badge">
              {{ activeFiltersCount }}
            </span>
          </button>

          <div class="search-page__divider" />

          <div class="search-page__chips-scroll">
            <SearchActiveFilters
              :filters="filtersFromUrl"
              @remove="removeFilter"
              @clear="clearFilters"
            />
          </div>
        </div>
      </div>

      <SearchActivityGrid
        :activities="activities"
        :loading="loading"
        :total="activities.length"
        :filters="filtersFromUrl"
        @clear="clearAll"
      />
    </div>
  </div>

  <SearchFilterDrawer
    v-model:open="drawerOpen"
    :model-value="filtersFromUrl"
    :base-activities="store.allActivities"
    :loading-base="store.loadingAllActivities"
    @apply="onDrawerApply"
    @clear="clearFilters"
  />
</template>

<style scoped>
/* ── Página ────────────────────────────────────────────────────── */
.search-page {
  min-height: 100vh;
  background-color: var(--color-bg-secondary, #f9fafb);
}

.search-page__container {
  max-width: 80rem;
  margin-inline: auto;
  padding: var(--space-8) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* ── Encabezado ────────────────────────────────────────────────── */
.search-page__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.search-page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.search-page__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

/* ── Filter bar ────────────────────────────────────────────────── */
.search-page__filter-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* ── Desktop filtros ───────────────────────────────────────────── */
.search-page__desktop-filters {
  display: none;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.search-page__desktop-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-inline-start: auto;
}

/* Botón limpiar — ghost verde */
.search-page__btn-clear {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--border-radius-full);
  border: 1.5px solid var(--color-secondary-300);
  background: transparent;
  color: var(--color-secondary-700);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.search-page__btn-clear:hover {
  background-color: var(--color-secondary-50);
  border-color: var(--color-secondary-400);
}

/* Botón buscar — verde sólido */
.search-page__btn-search {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--border-radius-full);
  background-color: var(--color-secondary-500);
  color: white;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  border: none;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  white-space: nowrap;
}

.search-page__btn-search:hover {
  background-color: var(--color-secondary-600);
}

.search-page__btn-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

/* ── Desktop chips ─────────────────────────────────────────────── */
.search-page__desktop-chips {
  display: none;
}

/* ── Mobile bar ────────────────────────────────────────────────── */
.search-page__mobile-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow: hidden;
}

.search-page__filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: var(--space-1) var(--space-2);
  background: none;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  color: var(--color-secondary-600);
  transition: color var(--transition-fast);
  line-height: 1;
}

.search-page__filter-btn:hover {
  color: var(--color-secondary-800);
}

.search-page__filter-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

.search-page__filter-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: 1;
}

.search-page__filter-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border-radius: var(--border-radius-full);
  background-color: var(--color-secondary-500);
  color: white;
  font-size: 0.625rem;
  font-weight: var(--font-weight-bold);
  line-height: 1;
  flex-shrink: 0;
}

.search-page__divider {
  width: 1px;
  height: 1.25rem;
  background-color: var(--color-neutral-200);
  flex-shrink: 0;
}

.search-page__chips-scroll {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow-x: auto;
  min-width: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.search-page__chips-scroll::-webkit-scrollbar {
  display: none;
}

/* ── Responsive ────────────────────────────────────────────────── */
@media (min-width: 768px) {
  .search-page__container {
    padding-inline: var(--space-6);
  }

  .search-page__desktop-filters {
    display: flex;
  }

  .search-page__desktop-chips {
    display: block;
  }

  .search-page__mobile-bar {
    display: none;
  }
}

@media (min-width: 1024px) {
  .search-page__container {
    padding-inline: var(--space-8);
  }
}
</style>
